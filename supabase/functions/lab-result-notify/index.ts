// ===================================================================
// TIER 4.2: Lab Result Notification Edge Function
// ===================================================================
// Trigger: When lab_results inserted with ordering_doctor_id
// Purpose: Route notification to ordering doctor, track consent
// File: supabase/functions/lab-result-notify/index.ts
//
// S2-07 / EDGE-17:
//   - No SMS, e-mail or in-app delivery provider is connected to this function. A channel
//     is reported as delivered only when it returns success. With no provider the
//     notification stays `pending` and the response is 202, never a fake success.
//   - Criticality fails closed: a lookup error, a missing range or an unparseable value
//     sets requires_immediate_action (it is no longer treated as "not critical").
//   - Logs carry identifiers and reasons only: no phone numbers, e-mail addresses, test
//     names or lab values.
// ===================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { withRateLimit } from "../_shared/rateLimit.ts";
import { logEdge } from "../_shared/sanitizeLog.ts";
import { getAuthorizedActor } from "../_shared/authorize.ts";
import { findInHospital, findProfileInHospital, isUuid } from "../_shared/tenantScope.ts";

// S0-06 / EDGE-13: the lab result, its order, patient and ordering doctor are
// read from the database in the caller's hospital. The body's `labResult`
// object is ignored (it used to choose the doctor, hospital and values).

type Channel = { success: boolean; message: string };
type Criticality = { isCritical: boolean; reviewRequired: boolean; reason: string };

const handler = async (req: Request): Promise<Response> => {
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

    // Criticality (fail closed, EDGE-17)
    const criticality = await assessCriticality(supabase, labResult);
    const isCritical = criticality.isCritical;
    const requiresAction = criticality.isCritical || criticality.reviewRequired;

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
        requires_immediate_action: requiresAction,
        notification_method: "in_app",
      })
      .select()
      .single();

    if (notificationError) {
      logEdge("error", "lab-result-notify", { stage: "notification_insert", code: notificationError.code });
      throw notificationError;
    }

    // Delivery (EDGE-17): no provider is connected, so each channel reports that it was not
    // delivered. A channel counts as delivered only on a provider success.
    const results = {
      in_app: undelivered("no in-app delivery channel is connected"),
      sms: doctor.phone ? undelivered("no SMS provider is configured") : null,
      email: doctor.email
        ? undelivered("no e-mail provider is configured")
        : undelivered("no e-mail address on file"),
    };
    const deliveredVia = Object.entries(results)
      .filter(([, channel]) => channel?.success === true)
      .map(([name]) => name);
    const delivered = deliveredVia.length > 0;

    // Update notification with delivery status. It stays `pending` until a channel delivers.
    await supabase
      .from("lab_result_notifications")
      .update({
        status: delivered ? "notified" : "pending",
        notified_at: delivered ? new Date().toISOString() : null,
        metadata: {
          delivery_results: results,
          delivered_via: deliveredVia,
          criticality_reason: criticality.reason,
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
        requires_immediate_action: requiresAction,
        delivered,
        notification_id: notification.id,
        ordering_doctor_id: doctor.id,
      },
    });

    return json(delivered ? 200 : 202, {
      success: delivered,
      status: delivered ? "notified" : "pending",
      notification_id: notification.id,
      delivery_status: results,
    });

  } catch (error) {
    logEdge("error", "lab-result-notify", { stage: "unhandled", error });
    return json(500, { error: "Internal server error" });
  }
};

serve((req) => withRateLimit(req, handler));

// ===================================================================
// Helper Functions
// ===================================================================

function undelivered(message: string): Channel {
  return { success: false, message };
}

const isNum = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/**
 * Grades the result against the hospital's critical range. Every path that cannot grade
 * the value sets reviewRequired (fail closed), so it is never silently "not critical".
 */
async function assessCriticality(supabase: any, labResult: any): Promise<Criticality> {
  const { data: range, error } = await supabase
    .from("lab_critical_ranges")
    .select("critical_low, critical_high")
    .eq("hospital_id", labResult.hospital_id)
    .eq("test_code", labResult.test_code)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    logEdge("error", "lab-result-notify", { stage: "criticality_lookup", code: error.code });
    return { isCritical: false, reviewRequired: true, reason: "criticality_lookup_failed" };
  }
  if (!range || (!isNum(range.critical_low) && !isNum(range.critical_high))) {
    return { isCritical: false, reviewRequired: true, reason: "no_critical_range_configured" };
  }

  const value = Number.parseFloat(String(labResult.result_value));
  if (!Number.isFinite(value)) {
    return { isCritical: false, reviewRequired: true, reason: "unparseable_value" };
  }
  if (isNum(range.critical_low) && value <= range.critical_low) {
    return { isCritical: true, reviewRequired: false, reason: "critical_low" };
  }
  if (isNum(range.critical_high) && value >= range.critical_high) {
    return { isCritical: true, reviewRequired: false, reason: "critical_high" };
  }
  return { isCritical: false, reviewRequired: false, reason: "within_range" };
}
