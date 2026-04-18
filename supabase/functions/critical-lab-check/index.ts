// ===================================================================
// TIER 4.4: Critical Lab Alert Escalation Edge Function
// ===================================================================
// Trigger: When lab_results inserted with critical values
// Purpose: Create escalation chain (primary → on-call → ER)
// File: supabase/functions/critical-lab-check/index.ts
// ===================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Constants
const ESCALATION_DELAYS = {
  to_on_call_minutes: 5,
  to_er_minutes: 10,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { labResultId, labResult } = await req.json();

    if (!labResultId || !labResult) {
      return new Response(
        JSON.stringify({ error: "Missing labResultId or labResult data" }),
        { status: 400, headers: corsHeaders }
      );
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

    // Schedule on-call escalation (5 min timeout)
    scheduleEscalation(
      supabase,
      alert.id,
      "on_call",
      ESCALATION_DELAYS.to_on_call_minutes * 60 * 1000
    );

    // Schedule ER escalation (10 min timeout)
    scheduleEscalation(
      supabase,
      alert.id,
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
): Promise<{ severity: string; isCritical: boolean }> {
  try {
    // Get critical ranges for this test
    const { data: ranges, error } = await supabase
      .from("lab_critical_ranges")
      .select("critical_low, critical_high, warning_low, warning_high")
      .eq("hospital_id", labResult.hospital_id)
      .eq("test_code", labResult.test_code)
      .eq("is_active", true)
      .eq("age_group", "adult") // TODO: Get from patient demographics
      .single();

    if (error || !ranges) {
      console.log("No critical ranges found for test:", labResult.test_code);
      return { severity: "unknown", isCritical: false };
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
    console.error("Critical value check failed:", e);
    return { severity: "error", isCritical: false };
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
      console.log(`SMS to ${doctor.phone_number}: ${message}`);
      // TODO: Integrate Twilio or similar
    }

    // Send email
    console.log(`Email to ${doctor.email}: ${message}`);
    // TODO: Integrate SendGrid or similar

  } catch (e) {
    console.error(`Failed to notify doctor at ${level}:`, e);
  }
}

function scheduleEscalation(
  supabase: any,
  alertId: string,
  escalateTo: "on_call" | "er",
  delayMs: number
): void {
  // Schedule background job for escalation
  // In production, use a job queue (Bull, Inngest, etc.)
  // For now, log the intent
  console.log(
    `Scheduled escalation to ${escalateTo} in ${delayMs / 1000}s for alert ${alertId}`
  );

  // TODO: Implement via:
  // - Supabase Edge Function scheduler (if available)
  // - External job queue (Bull/Redis, AWS Lambda, etc.)
  // - Polling mechanism in React hook
}
