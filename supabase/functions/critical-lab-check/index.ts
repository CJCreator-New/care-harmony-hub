// ===================================================================
// critical-lab-check: Critical Lab Escalation Queue (roadmap S0-08)
// ===================================================================
// Actions (POST JSON):
//   { action: "create_alert" (default), lab_order_id, analytes: [{code, name?, value, unit?}],
//     manual_critical?, notes? }
//       User JWT; roles admin | lab_technician | doctor | nurse; order must be in the
//       caller's hospital. Grades every analyte on the server (fail closed), creates ONE
//       open alert per lab order (idempotent), queues the ladder primary(0) / on_call(5) /
//       er(10 min) and dispatches the primary level immediately.
//   { action: "acknowledge", alert_id? | lab_order_id?, notes?, read_back? }
//       User JWT; roles admin | doctor | nurse | lab_technician (lab staff record the
//       clinician's verbal read-back). Idempotent. Cancels pending escalation rows.
//   { action: "process_escalations", limit? }
//       SERVICE ONLY (pg_cron via pg_net). Requires header x-critical-lab-worker-secret ==
//       CRITICAL_LAB_WORKER_SECRET, or Bearer == the service-role key. A user JWT is
//       rejected. Processes due rows across all hospitals.
//
// Pure logic (grading, ladder, retry policy, worker auth) lives in
// ../_shared/criticalLabEscalation.ts and is unit-tested in tests/critical-lab/.
// Schema: supabase/pending-migrations/20261105000001_critical_lab_escalation_queue.sql
// ===================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthorizedActor } from "../_shared/authorize.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  type AcknowledgeRequest,
  type AlertSeverity,
  type ChannelResult,
  type CreateAlertRequest,
  type EscalationLevel,
  type HospitalRangeRow,
  NOTIFIED_AT_COLUMN,
  PROCESSING_LEASE_MINUTES,
  ageGroupFromDob,
  buildLadderSchedule,
  decideDispatchOutcome,
  decideResult,
  gradeAnalyte,
  inAppMessage,
  isWorkerAuthorized,
  lookupCodesFor,
  pagerMessage,
  parseCriticalLabRequest,
  resolveRange,
} from "../_shared/criticalLabEscalation.ts";

const CREATE_ROLES = ["admin", "lab_technician", "doctor", "nurse"];
const ACK_ROLES = ["admin", "doctor", "nurse", "lab_technician"];

// deno-lint-ignore no-explicit-any
type Db = any;

interface ActorContext {
  userId: string;
  hospitalId: string;
  profileId: string;
}

interface Recipient {
  profile_id: string;
  user_id: string;
  phone: string | null;
  source: "ordering_doctor" | "assigned" | "on_call_schedule" | "er_schedule" | "fallback_admin";
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const json = (status: number, payload: Record<string, unknown>) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const parsed = parseCriticalLabRequest(await req.json().catch(() => null));
    if (!parsed.ok) return json(400, { error: "Validation failed", details: parsed.error });
    const request = parsed.value;

    const db: Db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // ── Worker: service credentials only, never a user JWT ──
    if (request.action === "process_escalations") {
      const authorized = isWorkerAuthorized((name) => req.headers.get(name), {
        workerSecret: Deno.env.get("CRITICAL_LAB_WORKER_SECRET"),
        serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      });
      if (!authorized) return json(401, { error: "Worker credentials required" });
      const summary = await processDueEscalations(db, request.limit, new Date());
      return json(200, { success: true, ...summary });
    }

    // ── User actions: user JWT + role + hospital scope ──
    const roles = request.action === "acknowledge" ? ACK_ROLES : CREATE_ROLES;
    const { actor, response: authErr } = await getAuthorizedActor(req, roles);
    if (authErr || !actor) {
      return new Response(await authErr!.text(), {
        status: authErr!.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!actor.hospitalId) return json(403, { error: "Forbidden - caller has no hospital" });

    const { data: profile, error: profileErr } = await db
      .from("profiles")
      .select("id, hospital_id")
      .eq("user_id", actor.userId)
      .maybeSingle();
    if (profileErr || !profile) return json(403, { error: "Forbidden - caller profile not found" });

    const ctx: ActorContext = { userId: actor.userId, hospitalId: actor.hospitalId, profileId: profile.id };

    if (request.action === "acknowledge") return await acknowledge(db, ctx, request, json);
    return await createAlert(db, ctx, request, json);
  } catch (error) {
    // Never log request bodies: they carry PHI.
    console.error("[critical-lab-check] unhandled error:", error instanceof Error ? error.message : String(error));
    return json(500, { error: "Internal error in critical-lab-check" });
  }
});

// ===================================================================
// create_alert
// ===================================================================

async function createAlert(
  db: Db,
  ctx: ActorContext,
  req: CreateAlertRequest,
  json: (s: number, p: Record<string, unknown>) => Response,
): Promise<Response> {
  const now = new Date();

  const { data: order, error: orderErr } = await db
    .from("lab_orders")
    .select("id, hospital_id, patient_id, ordered_by, test_name, test_code")
    .eq("id", req.lab_order_id)
    .maybeSingle();
  if (orderErr) return json(500, { error: "Failed to load lab order" });
  if (!order) return json(404, { error: "Lab order not found" });
  if (order.hospital_id !== ctx.hospitalId) return json(403, { error: "Forbidden - hospital scope mismatch" });

  // Ordering clinician: lab_orders.ordered_by normally holds profiles.id, but some
  // call sites store the auth user id. Accept either, same hospital only.
  const primary = await findProfile(db, order.ordered_by, order.hospital_id);

  const { data: patient } = await db
    .from("patients")
    .select("date_of_birth")
    .eq("id", order.patient_id)
    .maybeSingle();
  const ageGroup = ageGroupFromDob(patient?.date_of_birth ?? null, now);

  const codes = [...new Set(req.analytes.flatMap((a) => lookupCodesFor(a.code)))];
  let hospitalRows: HospitalRangeRow[] = [];
  let rangesWarning: string | null = null;
  if (codes.length) {
    const { data: rows, error: rangesErr } = await db
      .from("lab_critical_ranges")
      .select("test_code, age_group, critical_low, critical_high, warning_low, warning_high, unit_of_measure")
      .eq("hospital_id", order.hospital_id)
      .eq("is_active", true)
      .in("test_code", codes);
    if (rangesErr) rangesWarning = "hospital_ranges_unavailable_used_defaults";
    else hospitalRows = rows ?? [];
  }

  const graded = req.analytes.map((a) => gradeAnalyte(a, resolveRange(a.code, hospitalRows, ageGroup)));
  const decision = decideResult(graded, req.manual_critical);

  if (!decision.requiresAlert) {
    return json(200, {
      success: true,
      critical: false,
      analytes: graded.map(({ code, grade }) => ({ code, grade })),
    });
  }

  const headline = decision.headline;
  const alertRow = {
    hospital_id: order.hospital_id,
    lab_order_id: order.id,
    lab_result_id: null,
    patient_id: order.patient_id,
    test_code: headline?.code ?? order.test_code ?? "MANUAL",
    test_name: headline ? `${order.test_name} — ${headline.name}` : order.test_name,
    result_value: headline?.value ?? null,
    result_text: headline?.raw || null,
    unit: headline?.unit ?? null,
    severity: decision.severity as AlertSeverity,
    primary_doctor_id: primary?.profile_id ?? null,
    created_by: ctx.profileId,
    metadata: {
      analytes: graded,
      reasons: decision.reasons,
      manual_critical: req.manual_critical,
      notes: req.notes ?? null,
      age_group: ageGroup,
      ordering_clinician_resolved: !!primary,
      ranges_warning: rangesWarning,
    },
  };

  let duplicate = false;
  let alert: Record<string, unknown> | null = null;
  const inserted = await db.from("lab_critical_alerts").insert(alertRow).select("*").single();
  if (inserted.error) {
    if (inserted.error.code !== "23505") {
      console.error("[critical-lab-check] alert insert failed:", inserted.error.code, inserted.error.message);
      return json(500, { error: "Failed to record critical alert" });
    }
    // Unique open alert per lab order: this submission is a retry or a re-entry.
    duplicate = true;
    const existing = await db
      .from("lab_critical_alerts")
      .select("*")
      .eq("lab_order_id", order.id)
      .eq("is_resolved", false)
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing.error || !existing.data) return json(500, { error: "Failed to load existing critical alert" });
    alert = existing.data;
  } else {
    alert = inserted.data;
  }
  const alertId = alert!.id as string;

  // Ladder: one row per level; re-inserting is a no-op (unique alert_id, escalation_level).
  const ladder = buildLadderSchedule(new Date(alert!.created_at as string)).map((r) => ({
    ...r,
    alert_id: alertId,
    hospital_id: order.hospital_id,
    target_user_id: r.escalation_level === "primary" ? (alert!.primary_doctor_id ?? null) : null,
    status: "pending",
  }));
  const ladderRes = await db
    .from("lab_alert_escalations")
    .upsert(ladder, { onConflict: "alert_id,escalation_level", ignoreDuplicates: true });
  if (ladderRes.error) {
    console.error("[critical-lab-check] ladder insert failed:", ladderRes.error.code, ladderRes.error.message);
    return json(500, { error: "Critical alert recorded but escalation queue could not be created", alert_id: alertId });
  }

  // Primary level at 0 minutes: dispatch now instead of waiting for the next cron tick.
  const { data: primaryRow } = await db
    .from("lab_alert_escalations")
    .select("*")
    .eq("alert_id", alertId)
    .eq("escalation_level", "primary")
    .maybeSingle();
  const primaryDispatch = primaryRow && primaryRow.status === "pending"
    ? await claimAndDispatch(db, primaryRow, now)
    : { outcome: primaryRow?.status ?? "missing" };

  return json(200, {
    success: true,
    critical: true,
    alert_id: alertId,
    severity: alert!.severity,
    duplicate,
    escalation_scheduled: true,
    primary_dispatch: primaryDispatch,
    analytes: graded.map(({ code, grade, reason }) => ({ code, grade, reason })),
  });
}

// ===================================================================
// acknowledge (idempotent)
// ===================================================================

async function acknowledge(
  db: Db,
  ctx: ActorContext,
  req: AcknowledgeRequest,
  json: (s: number, p: Record<string, unknown>) => Response,
): Promise<Response> {
  let query = db.from("lab_critical_alerts").select("*");
  query = req.alert_id
    ? query.eq("id", req.alert_id)
    : query.eq("lab_order_id", req.lab_order_id).eq("is_resolved", false).order("created_at", { ascending: false }).limit(1);
  const { data: alert, error } = await query.maybeSingle();
  if (error) return json(500, { error: "Failed to load critical alert" });
  if (!alert) return json(404, { error: "No open critical alert", code: "no_open_alert" });
  if (alert.hospital_id !== ctx.hospitalId) return json(403, { error: "Forbidden - hospital scope mismatch" });

  const now = new Date().toISOString();
  let alreadyAcknowledged = !!alert.acknowledged_at;

  if (!alreadyAcknowledged) {
    const update: Record<string, unknown> = {
      acknowledged_at: now,
      acknowledged_by: ctx.profileId,
      acknowledgment_notes: req.notes ?? null,
      acknowledgment_channel: req.read_back?.channel ?? "in_app",
      acknowledgment_details: req.read_back ? { read_back: req.read_back } : {},
    };
    if (alert.primary_doctor_id === ctx.profileId) update.primary_acknowledged_at = now;
    else if (alert.on_call_id === ctx.profileId) update.on_call_acknowledged_at = now;

    const { data: updated, error: ackErr } = await db
      .from("lab_critical_alerts")
      .update(update)
      .eq("id", alert.id)
      .is("acknowledged_at", null)
      .select("id");
    if (ackErr) {
      console.error("[critical-lab-check] acknowledge failed:", ackErr.code, ackErr.message);
      return json(500, { error: "Failed to acknowledge critical alert" });
    }
    if (!updated?.length) alreadyAcknowledged = true; // lost a race with another acknowledger
  }

  // The DB trigger also cancels the queue; doing it here too keeps this path correct
  // even before the migration's trigger is installed. Both are idempotent.
  const { data: cancelled, error: cancelErr } = await db
    .from("lab_alert_escalations")
    .update({ status: "cancelled", error_message: "alert acknowledged" })
    .eq("alert_id", alert.id)
    .eq("status", "pending")
    .select("id");
  if (cancelErr) {
    return json(500, { error: "Alert acknowledged but pending escalations could not be cancelled", alert_id: alert.id });
  }

  return json(200, {
    success: true,
    acknowledged: true,
    already_acknowledged: alreadyAcknowledged,
    alert_id: alert.id,
    cancelled_escalations: cancelled?.length ?? 0,
  });
}

// ===================================================================
// Worker
// ===================================================================

async function processDueEscalations(db: Db, limit: number, now: Date) {
  const nowIso = now.toISOString();
  const leaseIso = new Date(now.getTime() - PROCESSING_LEASE_MINUTES * 60_000).toISOString();
  const { data: due, error } = await db
    .from("lab_alert_escalations")
    .select("*")
    .or(`and(status.eq.pending,scheduled_for.lte."${nowIso}"),and(status.eq.processing,last_attempt_at.lt."${leaseIso}")`)
    .order("scheduled_for", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`fetch due escalations failed: ${error.code ?? ""} ${error.message}`);

  const results: Array<Record<string, unknown>> = [];
  for (const row of due ?? []) {
    results.push({ id: row.id, level: row.escalation_level, ...(await claimAndDispatch(db, row, now)) });
  }
  const count = (o: string) => results.filter((r) => r.outcome === o).length;
  return {
    examined: results.length,
    dispatched: count("dispatched"),
    retrying: count("pending"),
    failed: count("failed"),
    cancelled: count("cancelled"),
    skipped: count("skipped"),
    results,
  };
}

/**
 * Claims one escalation row (optimistic: status + attempt_count must be unchanged),
 * re-checks the alert, resolves recipients, dispatches and records the honest outcome.
 */
async function claimAndDispatch(db: Db, row: Record<string, any>, now: Date): Promise<Record<string, unknown>> {
  const attempt = (row.attempt_count ?? 0) + 1;
  const { data: claimed, error: claimErr } = await db
    .from("lab_alert_escalations")
    .update({ status: "processing", attempt_count: attempt, last_attempt_at: now.toISOString() })
    .eq("id", row.id)
    .eq("status", row.status)
    .eq("attempt_count", row.attempt_count ?? 0)
    .select("id");
  if (claimErr) return { outcome: "skipped", reason: `claim_failed:${claimErr.code ?? ""}` };
  if (!claimed?.length) return { outcome: "skipped", reason: "claimed_elsewhere" };

  const level = row.escalation_level as EscalationLevel;
  const { data: alert } = await db.from("lab_critical_alerts").select("*").eq("id", row.alert_id).maybeSingle();
  if (!alert || alert.acknowledged_at || alert.is_resolved) {
    await db
      .from("lab_alert_escalations")
      .update({ status: "cancelled", error_message: alert ? "alert acknowledged or resolved" : "alert missing" })
      .eq("id", row.id);
    return { outcome: "cancelled" };
  }

  const recipients = await resolveRecipients(db, alert, row, level, now);
  const results: ChannelResult[] = [];

  if (recipients.length) {
    const { title, message } = inAppMessage({
      level,
      testName: alert.test_name,
      severity: alert.severity,
      value: alert.result_text ?? (alert.result_value !== null ? String(alert.result_value) : null),
      unit: alert.unit ?? null,
    });
    const { error: notifErr } = await db.from("notifications").insert(
      recipients.map((r) => ({
        hospital_id: alert.hospital_id,
        recipient_id: r.user_id, // notifications.recipient_id references profiles.user_id
        type: "alert",
        category: "clinical",
        priority: "urgent",
        title,
        message,
        action_url: "/laboratory",
        metadata: {
          kind: "critical_lab_escalation",
          alert_id: alert.id,
          escalation_id: row.id,
          escalation_level: level,
          lab_order_id: alert.lab_order_id,
          recipient_source: r.source,
        },
      })),
    );
    for (const r of recipients) {
      results.push({
        channel: "in_app",
        recipient_profile_id: r.profile_id,
        status: notifErr ? "failed" : "delivered",
        detail: notifErr ? `db:${notifErr.code ?? "error"}` : r.source,
      });
    }
    const text = pagerMessage(level, alert.id);
    for (const r of recipients) results.push(await pagerProviderHook(r, text, alert.id));
  }

  const outcome = decideDispatchOutcome(results, attempt, now);
  const update: Record<string, unknown> = {
    status: outcome.status,
    error_message: outcome.error_message,
    delivery_log: results,
  };
  if (outcome.status === "dispatched") update.dispatched_at = now.toISOString();
  if (outcome.retry_at) update.scheduled_for = outcome.retry_at;
  // Record who was reached; not pinned before success so a retry re-resolves the roster.
  if (outcome.status === "dispatched" && !row.target_user_id && recipients[0]) {
    update.target_user_id = recipients[0].profile_id;
  }

  const { error: saveErr } = await db.from("lab_alert_escalations").update(update).eq("id", row.id);
  if (saveErr) console.error("[critical-lab-check] escalation status save failed:", row.id, saveErr.code);

  if (outcome.status === "dispatched") {
    const col = NOTIFIED_AT_COLUMN[level];
    const alertUpdate: Record<string, unknown> = { [col]: now.toISOString() };
    if (level === "on_call" && !alert.on_call_id && recipients[0]?.source === "on_call_schedule") {
      alertUpdate.on_call_id = recipients[0].profile_id;
    }
    await db.from("lab_critical_alerts").update(alertUpdate).eq("id", alert.id).is(col, null);
  }

  return {
    outcome: outcome.status,
    delivered_count: outcome.delivered_count,
    recipients: recipients.length,
    error_message: outcome.error_message,
  };
}

async function findProfile(db: Db, idOrUserId: string | null, hospitalId: string): Promise<Recipient | null> {
  if (!idOrUserId) return null;
  for (const column of ["id", "user_id"]) {
    const { data } = await db
      .from("profiles")
      .select("id, user_id, phone, hospital_id")
      .eq(column, idOrUserId)
      .eq("hospital_id", hospitalId)
      .maybeSingle();
    if (data) return { profile_id: data.id, user_id: data.user_id, phone: data.phone ?? null, source: "ordering_doctor" };
  }
  return null;
}

async function profilesByIds(db: Db, ids: string[], hospitalId: string, source: Recipient["source"]): Promise<Recipient[]> {
  if (!ids.length) return [];
  const { data } = await db
    .from("profiles")
    .select("id, user_id, phone, hospital_id")
    .in("id", ids)
    .eq("hospital_id", hospitalId);
  return (data ?? []).map((p: Record<string, any>) => ({ profile_id: p.id, user_id: p.user_id, phone: p.phone ?? null, source }));
}

async function resolveRecipients(
  db: Db,
  alert: Record<string, any>,
  row: Record<string, any>,
  level: EscalationLevel,
  now: Date,
): Promise<Recipient[]> {
  const hospitalId = alert.hospital_id as string;
  let recipients: Recipient[] = [];

  if (row.target_user_id) {
    recipients = await profilesByIds(db, [row.target_user_id], hospitalId, level === "primary" ? "ordering_doctor" : "assigned");
  } else if (level === "primary" && alert.primary_doctor_id) {
    recipients = await profilesByIds(db, [alert.primary_doctor_id], hospitalId, "ordering_doctor");
  } else if (level === "on_call" || level === "er") {
    const nowIso = now.toISOString();
    const { data: shifts, error } = await db
      .from("on_call_schedule")
      .select("profile_id")
      .eq("hospital_id", hospitalId)
      .eq("tier", level)
      .eq("is_active", true)
      .lte("starts_at", nowIso)
      .gt("ends_at", nowIso);
    if (error) console.error("[critical-lab-check] on_call_schedule lookup failed:", error.code);
    const ids = [...new Set((shifts ?? []).map((s: { profile_id: string }) => s.profile_id))]
      .filter((id) => level === "er" || id !== alert.primary_doctor_id) as string[];
    recipients = await profilesByIds(db, ids, hospitalId, level === "on_call" ? "on_call_schedule" : "er_schedule");
  }

  if (recipients.length) return recipients;

  // Nobody scheduled or resolvable: fail safe to the hospital's administrators
  // rather than letting the level pass silently. The fallback is recorded.
  const { data: admins } = await db
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .eq("hospital_id", hospitalId);
  const adminUserIds = (admins ?? []).map((a: { user_id: string }) => a.user_id);
  if (!adminUserIds.length) return [];
  const { data: adminProfiles } = await db
    .from("profiles")
    .select("id, user_id, phone, hospital_id")
    .in("user_id", adminUserIds)
    .eq("hospital_id", hospitalId);
  return (adminProfiles ?? []).map((p: Record<string, any>) => ({
    profile_id: p.id,
    user_id: p.user_id,
    phone: p.phone ?? null,
    source: "fallback_admin" as const,
  }));
}

/**
 * SMS/pager provider hook. A NO-OP returning 'not_configured' unless BOTH
 * CRITICAL_LAB_PAGER_WEBHOOK_URL and CRITICAL_LAB_PAGER_WEBHOOK_TOKEN are set.
 * Point it at a provider (or a thin relay) covered by a BAA. The payload carries
 * no PHI: pagerMessage() contains only a short alert reference.
 * 'delivered' here means the provider accepted the message (HTTP 2xx);
 * handset delivery receipts are not tracked yet.
 */
async function pagerProviderHook(recipient: Recipient, text: string, alertId: string): Promise<ChannelResult> {
  const url = Deno.env.get("CRITICAL_LAB_PAGER_WEBHOOK_URL");
  const token = Deno.env.get("CRITICAL_LAB_PAGER_WEBHOOK_TOKEN");
  const base = { channel: "pager" as const, recipient_profile_id: recipient.profile_id };
  if (!url || !token) return { ...base, status: "not_configured" };
  if (!recipient.phone) return { ...base, status: "no_contact", detail: "no phone on profile" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: recipient.phone, message: text, reference: alertId }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok
      ? { ...base, status: "delivered", detail: `provider_accepted:${res.status}` }
      : { ...base, status: "failed", detail: `provider_http_${res.status}` };
  } catch (e) {
    return { ...base, status: "failed", detail: e instanceof Error ? e.name : "error" };
  }
}
