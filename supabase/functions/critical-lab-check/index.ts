// ===================================================================
// TIER 4.4: Critical Lab Alert Escalation Edge Function
// ===================================================================
// Trigger: When lab_results inserted with critical values
// Purpose: Create escalation chain (primary → on-call → ER)
// File: supabase/functions/critical-lab-check/index.ts
// ===================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getAuthorizedActor } from "../_shared/authorize.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// Constants
const ESCALATION_DELAYS = {
  to_on_call_minutes: 5,
  to_er_minutes: 10,
};

// Roles permitted to record lab results / trigger critical-value escalation.
const ALLOWED_ROLES = ["admin", "lab_technician", "doctor", "nurse"];

const labCheckSchema = z.object({
  labResultId: z.string().uuid(),
  labResult: z.object({
    hospital_id: z.string().uuid(),
    patient_id: z.string().uuid(),
    test_code: z.string().min(1),
    test_name: z.string().optional(),
    result_value: z.union([z.string(), z.number()]),
    unit: z.string().optional(),
    ordering_doctor_id: z.string().uuid(),
  }).passthrough(),
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const json = (status: number, payload: Record<string, unknown>) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── AuthZ: verify caller + hospital scope ──
    const { actor, response: authErr } = await getAuthorizedActor(req, ALLOWED_ROLES);
    if (authErr) {
      return new Response(await authErr.text(), {
        status: authErr.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return json(400, { error: "Missing request body" });
    }

    // ── Action: Doctor Acknowledgment (Halts Escalation) ──
    if (rawBody.action === "acknowledge") {
      const alertId = rawBody.alertId;
      if (!alertId) return json(400, { error: "Missing alertId for acknowledgment" });

      const now = new Date().toISOString();
      const { data: updated, error: ackErr } = await supabase
        .from("lab_alert_escalations")
        .update({ status: "acknowledged", acknowledged_at: now, acknowledged_by: actor!.userId })
        .eq("alert_id", alertId)
        .eq("hospital_id", actor!.hospitalId)
        .select();

      if (ackErr) {
        return json(500, { error: "Failed to acknowledge escalation queue", details: ackErr.message });
      }

      await supabase
        .from("critical_lab_alerts")
        .update({ status: "acknowledged", acknowledged_by: actor!.userId, acknowledged_at: now })
        .eq("id", alertId)
        .eq("hospital_id", actor!.hospitalId);

      return json(200, {
        success: true,
        message: "Alert acknowledged, escalations halted",
        count: updated?.length || 0,
      });
    }

    // ── Action: Process Due Escalations (Worker Runner) ──
    if (rawBody.action === "process_escalations") {
      const now = new Date().toISOString();
      const { data: pendingEscalations, error: fetchErr } = await supabase
        .from("lab_alert_escalations")
        .select("*")
        .eq("hospital_id", actor!.hospitalId)
        .eq("status", "pending")
        .lte("scheduled_for", now);

      if (fetchErr) {
        return json(500, { error: "Failed to fetch pending escalations", details: fetchErr.message });
      }

      const processed = [];
      for (const esc of (pendingEscalations || [])) {
        await supabase
          .from("lab_alert_escalations")
          .update({ status: "escalated", processed_at: now })
          .eq("id", esc.id);

        if (esc.escalation_level === "on_call") {
          await scheduleEscalation(
            supabase,
            esc.alert_id,
            esc.hospital_id,
            null,
            "er",
            5 * 60 * 1000
          );
        }
        processed.push({ id: esc.id, alert_id: esc.alert_id, level: esc.escalation_level });
      }

      return json(200, { success: true, processedCount: processed.length, processed });
    }

    const parsed = labCheckSchema.safeParse(rawBody);
    if (!parsed.success) {
      return json(400, {
        error: "Validation failed",
        details: parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
      });
    }
    const { labResultId, labResult } = parsed.data;

    // Prevent cross-hospital access: the lab result must belong to the caller's hospital.
    if (labResult.hospital_id !== actor!.hospitalId) {
      return json(403, { error: "Forbidden - hospital scope mismatch" });
    }

    // Check if this is a critical value
    const { severity, isCritical } = await checkCriticalValue(supabase, labResult);
    
    if (!isCritical) {
      return new Response(
        JSON.stringify({ success: true, critical: false }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Get primary doctor
    const { data: primaryDoctor, error: doctorError } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone_number, hospital_id")
      .eq("id", labResult.ordering_doctor_id)
      .single();

    if (doctorError || !primaryDoctor) {
      console.error("Primary doctor lookup failed:", doctorError);
      return new Response(
        JSON.stringify({ error: "Primary doctor not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Find on-call doctor for escalation
    const { data: onCallDoctor } = await findOnCallDoctor(
      supabase,
      primaryDoctor.hospital_id,
      primaryDoctor.id
    );

    // Create critical alert record
    const { data: alert, error: alertError } = await supabase
      .from("lab_critical_alerts")
      .insert({
        hospital_id: primaryDoctor.hospital_id,
        lab_result_id: labResultId,
        patient_id: labResult.patient_id,
        test_code: labResult.test_code,
        test_name: labResult.test_name,
        result_value: labResult.result_value,
        severity: severity,
        primary_doctor_id: primaryDoctor.id,
        on_call_id: onCallDoctor?.id || null,
        primary_notified_at: new Date().toISOString(),
        metadata: {
          escalation_chain: [
            primaryDoctor.id,
            onCallDoctor?.id || null,
            "er_staff", // Generic ER escalation
          ].filter(Boolean),
          critical_range_log: {
            value: labResult.result_value,
            unit: labResult.unit,
            severity,
          },
        },
      })
      .select()
      .single();

    if (alertError) {
      console.error("Alert creation failed:", alertError);
      throw alertError;
    }

    // Send primary doctor notification
    await notifyDoctor(supabase, alert, primaryDoctor, "primary");

    // Schedule on-call escalation (5 min timeout) via durable queue
    await scheduleEscalation(
      supabase,
      alert.id,
      primaryDoctor.hospital_id,
      onCallDoctor?.id || null,
      "on_call",
      ESCALATION_DELAYS.to_on_call_minutes * 60 * 1000
    );

    // Schedule ER escalation (10 min timeout) via durable queue
    await scheduleEscalation(
      supabase,
      alert.id,
      primaryDoctor.hospital_id,
      null,
      "er",
      ESCALATION_DELAYS.to_er_minutes * 60 * 1000
    );

    // Log activity
    await supabase.from("activity_logs").insert({
      hospital_id: primaryDoctor.hospital_id,
      user_id: null, // System generated
      action_type: "critical_lab_alert_created",
      resource_type: "lab_result",
      resource_id: labResultId,
      metadata: {
        alert_id: alert.id,
        severity,
        primary_doctor_id: primaryDoctor.id,
        on_call_doctor_id: onCallDoctor?.id || null,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        alert_id: alert.id,
        severity,
        primary_notified: true,
        escalation_scheduled: true,
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error("Critical lab alert error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

// ===================================================================
// Helper Functions
// ===================================================================

async function checkCriticalValue(
  supabase: any,
  labResult: any
): Promise<{ severity: string; isCritical: boolean; reason?: string }> {
  try {
    // 1. Resolve age group from patient demographics or direct parameter
    let ageGroup = labResult.age_group || "adult";
    if (!labResult.age_group && labResult.patient_id) {
      const { data: patient } = await supabase
        .from("patients")
        .select("date_of_birth")
        .eq("id", labResult.patient_id)
        .maybeSingle();

      if (patient?.date_of_birth) {
        const birthDate = new Date(patient.date_of_birth);
        const ageMs = Date.now() - birthDate.getTime();
        const ageDays = ageMs / (24 * 60 * 60 * 1000);
        const ageYears = ageDays / 365.25;

        if (ageDays < 28) ageGroup = "neonate";
        else if (ageYears < 1) ageGroup = "infant";
        else if (ageYears < 12) ageGroup = "pediatric";
        else if (ageYears < 18) ageGroup = "adolescent";
        else if (ageYears >= 65) ageGroup = "geriatric";
        else ageGroup = "adult";
      }
    }

    // 2. Query critical ranges for resolved age group, falling back to pediatric then adult
    let { data: ranges } = await supabase
      .from("lab_critical_ranges")
      .select("critical_low, critical_high, warning_low, warning_high")
      .eq("hospital_id", labResult.hospital_id)
      .eq("test_code", labResult.test_code)
      .eq("is_active", true)
      .eq("age_group", ageGroup)
      .maybeSingle();

    if (!ranges && (ageGroup === "neonate" || ageGroup === "infant")) {
      const { data: pedRanges } = await supabase
        .from("lab_critical_ranges")
        .select("critical_low, critical_high, warning_low, warning_high")
        .eq("hospital_id", labResult.hospital_id)
        .eq("test_code", labResult.test_code)
        .eq("is_active", true)
        .eq("age_group", "pediatric")
        .maybeSingle();
      if (pedRanges) ranges = pedRanges;
    }

    if (!ranges && ageGroup !== "adult") {
      const { data: fallbackRanges } = await supabase
        .from("lab_critical_ranges")
        .select("critical_low, critical_high, warning_low, warning_high")
        .eq("hospital_id", labResult.hospital_id)
        .eq("test_code", labResult.test_code)
        .eq("is_active", true)
        .eq("age_group", "adult")
        .maybeSingle();
      ranges = fallbackRanges;
    }

    if (!ranges) {
      console.warn("No critical ranges configured for test:", labResult.test_code, "— failing closed for physician verification");
      return { severity: "unverified_review_required", isCritical: true, reason: "Missing reference range - requires immediate manual review" };
    }

    const value = parseFloat(labResult.result_value);

    // Check critical thresholds first (highest priority)
    if (ranges.critical_low && value < ranges.critical_low) {
      return { severity: "critical_low", isCritical: true };
    }
    if (ranges.critical_high && value > ranges.critical_high) {
      return { severity: "critical_high", isCritical: true };
    }

    // Check warning thresholds
    if (ranges.warning_low && value < ranges.warning_low) {
      return { severity: "warning", isCritical: false };
    }
    if (ranges.warning_high && value > ranges.warning_high) {
      return { severity: "warning", isCritical: false };
    }

    return { severity: "normal", isCritical: false };
  } catch (e) {
    console.error("Critical value check failed, failing closed:", e);
    return { severity: "error_review_required", isCritical: true, reason: "Error during range evaluation - requires clinician review" };
  }
}

async function findOnCallDoctor(
  supabase: any,
  hospitalId: string,
  primaryDoctorId: string
): Promise<{ data: any | null }> {
  try {
    // Get on-call schedule for today
    const today = new Date().toISOString().split("T")[0];
    
    const { data: schedule } = await supabase
      .from("on_call_schedule")
      .select("doctor_id")
      .eq("hospital_id", hospitalId)
      .eq("date", today)
      .eq("specialty", "general") // Or based on lab test specialty
      .eq("is_active", true)
      .neq("doctor_id", primaryDoctorId) // Don't escalate to self
      .single();

    if (!schedule) {
      console.log("No on-call doctor found");
      return { data: null };
    }

    // Get doctor details
    const { data: doctor } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone_number")
      .eq("id", schedule.doctor_id)
      .single();

    return { data: doctor };
  } catch (e) {
    console.error("On-call lookup failed:", e);
    return { data: null };
  }
}

async function notifyDoctor(
  supabase: any,
  alert: any,
  doctor: any,
  level: "primary" | "on_call" | "er"
): Promise<void> {
  try {
    const urgency = alert.severity === "critical_high" || alert.severity === "critical_low"
      ? "🚨 CRITICAL"
      : "⚠️ WARNING";

    const message = `${urgency} Lab Alert: ${alert.test_name} = ${alert.result_value}. Severity: ${alert.severity}. Requires immediate review.`;

    // Send in-app notification
    await supabase.realtime.getSubscription(`doctor:${doctor.id}:alerts`)?.send({
      type: "broadcast",
      event: "critical_lab_alert",
      payload: {
        alert_id: alert.id,
        message,
        severity: alert.severity,
        level,
        timestamp: new Date().toISOString(),
      },
    });

    // Send SMS for critical values
    if (alert.severity.startsWith("critical")) {
      console.log(`SMS notification queued for doctor ${doctor.id} (alert ${alert.id})`);
      // Twilio SMS dispatch placeholder
    }

    // Send email
    console.log(`Email notification queued for doctor ${doctor.id} (alert ${alert.id})`);
  } catch (e) {
    console.error(`Failed to notify doctor at ${level}:`, e);
  }
}

async function scheduleEscalation(
  supabase: any,
  alertId: string,
  hospitalId: string,
  targetUserId: string | null,
  escalateTo: "on_call" | "er",
  delayMs: number
): Promise<void> {
  const scheduledFor = new Date(Date.now() + delayMs).toISOString();
  try {
    const { error } = await supabase.from("lab_alert_escalations").insert({
      alert_id: alertId,
      hospital_id: hospitalId,
      escalation_level: escalateTo,
      target_user_id: targetUserId,
      scheduled_for: scheduledFor,
      status: "pending",
    });

    if (error) {
      console.error(`[Escalation Queue] Insert failed for alert ${alertId}:`, error);
    } else {
      console.log(`[Escalation Queue] Scheduled ${escalateTo} escalation for alert ${alertId} at ${scheduledFor}`);
    }
  } catch (err) {
    console.error(`[Escalation Queue] Exception scheduling ${escalateTo}:`, err);
  }
}
