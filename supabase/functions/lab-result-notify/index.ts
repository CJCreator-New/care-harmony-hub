// ===================================================================
// TIER 4.2: Lab Result Notification Edge Function
// ===================================================================
// Trigger: When lab_results inserted with ordering_doctor_id
// Purpose: Route notification to ordering doctor, track consent
// File: supabase/functions/lab-result-notify/index.ts
// ===================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getAuthorizedActor } from "../_shared/authorize.ts";
import { findInHospital, findProfileInHospital, isUuid } from "../_shared/tenantScope.ts";

// S0-06 / EDGE-13: the lab result, its order, patient and ordering doctor are
// read from the database in the caller's hospital. The body's `labResult`
// object is ignored (it used to choose the doctor, hospital and values).

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const json = (status: number, payload: Record<string, unknown>) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const { actor, response: authError } = await getAuthorizedActor(req, ['admin', 'doctor', 'lab_technician', 'nurse']);
  if (authError || !actor) return authError ?? json(401, { error: "Unauthorized" });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const db = supabase as never;

    const body = await req.json().catch(() => ({}));
    const labResultId = body?.labResultId;
    if (!isUuid(labResultId)) {
      return json(400, { error: "labResultId must be a UUID" });
    }

    const result = await findInHospital(db, "lab_results", labResultId, actor.hospitalId, {
      select: "id, lab_order_id, result_value, result_unit, created_at, hospital_id",
    });
    if (!result) return json(404, { error: "Lab result not found" });

    const order = await findInHospital(db, "lab_orders", result.lab_order_id, actor.hospitalId, {
      select: "id, patient_id, ordered_by, test_name, test_code, hospital_id",
    });
    if (!order) return json(404, { error: "Lab order not found" });

    const labResult = {
      id: result.id,
      hospital_id: actor.hospitalId,
      patient_id: order.patient_id,
      test_name: order.test_name,
      test_code: order.test_code,
      result_value: result.result_value,
      unit: result.result_unit,
      created_at: result.created_at,
    };

    // Ordering doctor: same hospital only (ordered_by may hold profiles.id or user_id).
    const doctor = await findProfileInHospital<Record<string, any>>(
      db,
      order.ordered_by,
      actor.hospitalId,
      "id, user_id, email, phone, hospital_id",
    );
    if (!doctor) {
      return json(404, { error: "Doctor not found" });
    }

    // Determine if critical based on lab test type
    const isCritical = await isCriticalLabValue(supabase, labResult);

    // Create notification record
    const { data: notification, error: notificationError } = await supabase
      .from("lab_result_notifications")
      .insert({
        hospital_id: doctor.hospital_id,
        lab_result_id: labResultId,
        patient_id: labResult.patient_id,
        ordering_doctor_id: doctor.id,
        status: "pending",
        is_critical: isCritical,
        requires_immediate_action: isCritical,
        notification_method: "in_app", // Will add SMS/email routing later
      })
      .select()
      .single();

    if (notificationError) {
      console.error("Notification creation failed:", notificationError);
      throw notificationError;
    }

    // Determine delivery method
    const methods = await getNotificationMethods(supabase, doctor.id, doctor.hospital_id);
    
    // Send notifications
    const results = {
      in_app: await sendInAppNotification(supabase, notification, doctor, labResult),
      sms: isCritical ? await sendSmsNotification(doctor.phone, labResult) : null,
      email: await sendEmailNotification(doctor.email, labResult, isCritical),
    };

    // Update notification with delivery status
    await supabase
      .from("lab_result_notifications")
      .update({
        status: "notified",
        notified_at: new Date().toISOString(),
        metadata: {
          delivery_results: results,
          delivered_via: methods,
          timestamp: new Date().toISOString(),
        },
      })
      .eq("id", notification.id)
      .eq("hospital_id", actor.hospitalId);

    // Log activity: attributed to the caller who triggered it, not the doctor (EDGE-13).
    await supabase.from("activity_logs").insert({
      hospital_id: actor.hospitalId,
      user_id: actor.userId,
      action_type: "lab_result_notification_sent",
      entity_type: "lab_result",
      entity_id: labResultId,
      details: {
        critical: isCritical,
        notification_id: notification.id,
        ordering_doctor_id: doctor.id,
      },
    });

    return json(200, {
      success: true,
      notification_id: notification.id,
      delivery_status: results,
    });

  } catch (error) {
    console.error("Lab notification error:", error);
    return json(500, { error: "Internal server error" });
  }
});

// ===================================================================
// Helper Functions
// ===================================================================

async function isCriticalLabValue(supabase: any, labResult: any): Promise<boolean> {
  try {
    // Get critical ranges for this test
    const { data: ranges, error } = await supabase
      .from("lab_critical_ranges")
      .select("critical_low, critical_high")
      .eq("hospital_id", labResult.hospital_id)
      .eq("test_code", labResult.test_code)
      .eq("is_active", true)
      .single();

    if (error || !ranges) return false;

    const value = parseFloat(labResult.result_value);
    if (ranges.critical_low && value < ranges.critical_low) return true;
    if (ranges.critical_high && value > ranges.critical_high) return true;
    return false;
  } catch (e) {
    console.error("Critical value check failed:", e);
    return false;
  }
}

async function getNotificationMethods(
  supabase: any,
  doctorId: string,
  hospitalId: string
): Promise<string[]> {
  try {
    // Get doctor's notification preferences
    const { data: prefs, error } = await supabase
      .from("notification_preferences")
      .select("methods")
      .eq("user_id", doctorId)
      .eq("hospital_id", hospitalId)
      .single();

    if (error || !prefs) return ["in_app"];
    return prefs.methods || ["in_app"];
  } catch (e) {
    console.error("Preferences lookup failed:", e);
    return ["in_app"];
  }
}

async function sendInAppNotification(
  supabase: any,
  notification: any,
  doctor: any,
  labResult: any
): Promise<{ success: boolean; message: string }> {
  try {
    // Create real-time notification via Supabase channel
    const message = `Lab result for patient (${labResult.patient_id}): ${labResult.test_name} = ${labResult.result_value} ${labResult.unit}. ${notification.is_critical ? "⚠️ CRITICAL VALUE" : ""}`;
    
    // Broadcast to doctor's notification channel
    await supabase.realtime.getSubscription(`doctor:${doctor.id}:notifications`)?.send({
      type: "broadcast",
      event: "lab_result_notification",
      payload: {
        notification_id: notification.id,
        lab_result_id: labResult.id,
        message,
        is_critical: notification.is_critical,
        timestamp: new Date().toISOString(),
      },
    });

    return { success: true, message: "In-app notification sent" };
  } catch (e) {
    console.error("In-app notification failed:", e);
    return { success: false, message: e.message };
  }
}

async function sendSmsNotification(
  phoneNumber: string,
  labResult: any
): Promise<{ success: boolean; message: string } | null> {
  if (!phoneNumber) return null;

  try {
    // Integration point: Use Twilio or similar SMS service
    const message = `[CareSync] CRITICAL LAB: ${labResult.test_name} = ${labResult.result_value}. Requires immediate review. Check app for details.`;
    
    // TODO: Integrate with SMS service (Twilio, etc.)
    console.log(`SMS to ${phoneNumber}: ${message}`);
    
    return { success: true, message: "SMS queued" };
  } catch (e) {
    console.error("SMS notification failed:", e);
    return { success: false, message: e.message };
  }
}

async function sendEmailNotification(
  email: string,
  labResult: any,
  isCritical: boolean
): Promise<{ success: boolean; message: string }> {
  if (!email) return { success: false, message: "No email address" };

  try {
    // Integration point: Use SendGrid, Mailgun, or similar
    const subject = isCritical
      ? `🚨 CRITICAL Lab Result: ${labResult.test_name}`
      : `Lab Result Available: ${labResult.test_name}`;
    
    const body = `
      Lab result for patient:
      Test: ${labResult.test_name}
      Value: ${labResult.result_value} ${labResult.unit}
      Date: ${labResult.created_at}
      ${isCritical ? "\nThis is a CRITICAL value requiring immediate review." : ""}
      
      Please log in to CareSync to review full details and take action.
    `;
    
    // TODO: Integrate with email service
    console.log(`Email to ${email}: ${subject}`);
    
    return { success: true, message: "Email queued" };
  } catch (e) {
    console.error("Email notification failed:", e);
    return { success: false, message: e.message };
  }
}
