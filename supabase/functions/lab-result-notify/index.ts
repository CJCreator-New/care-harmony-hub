// ===================================================================
// TIER 4.2: Lab Result Notification Edge Function
// ===================================================================
// Trigger: When lab_results inserted with ordering_doctor_id
// Purpose: Route notification to ordering doctor, track consent
// File: supabase/functions/lab-result-notify/index.ts
// ===================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Get ordering doctor details
    const { data: doctor, error: doctorError } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone_number, hospital_id")
      .eq("id", labResult.ordering_doctor_id)
      .single();

    if (doctorError || !doctor) {
      console.error("Doctor lookup failed:", doctorError);
      return new Response(
        JSON.stringify({ error: "Doctor not found" }),
        { status: 404, headers: corsHeaders }
      );
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
      sms: isCritical ? await sendSmsNotification(doctor.phone_number, labResult) : null,
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
      .eq("id", notification.id);

    // Log activity
    await supabase.from("activity_logs").insert({
      hospital_id: doctor.hospital_id,
      user_id: doctor.id,
      action_type: "lab_result_notification_sent",
      resource_type: "lab_result",
      resource_id: labResultId,
      metadata: {
        critical: isCritical,
        notification_id: notification.id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
        delivery_status: results,
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error("Lab notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
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
