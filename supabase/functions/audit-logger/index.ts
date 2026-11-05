import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getAuthorizedActor } from "../_shared/authorize.ts";
import { withRateLimit } from "../_shared/rateLimit.ts";
import { validateRequest } from "../_shared/validation.ts";
import {
  AUDIT_READ_ROLES,
  AUDIT_WRITE_ROLES,
  auditLimit,
  buildAuditRecord,
  type AuditRecord,
} from "../_shared/auditEvent.ts";
import { hasAnyRole } from "../_shared/tenantScope.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// S0-06 / EDGE-09: the audit subject is always the JWT caller in their own
// hospital (body user_id / hospital_id / timestamp / severity are ignored);
// reads are admin-only, always hospital-scoped, and capped. An actor without a
// hospital is refused by getAuthorizedActor.

const auditSchema = z.object({
  action: z.string().min(1),
  events: z.any().optional(),
});

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const json = (status: number, payload: Record<string, unknown>) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  const { actor, response } = await getAuthorizedActor(req, [...AUDIT_WRITE_ROLES]);
  if (response || !actor) return response ?? json(401, { error: "Unauthorized" });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const validation = await validateRequest(req, auditSchema);
    if (!validation.success) {
      return json(400, { error: "Validation failed", details: validation.error });
    }
    const { action, events } = validation.data;
    const params = (events && typeof events === "object" ? events : {}) as Record<string, unknown>;

    switch (action) {
      case "log_event": {
        const built = buildAuditRecord(events, {
          userId: actor.userId,
          hospitalId: actor.hospitalId,
          // Client-reported; recorded for correlation only, not trusted for identity.
          ipAddress: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
          userAgent: req.headers.get("user-agent") || "unknown",
          now: new Date(),
        });
        if (!built.ok) return json(built.status, { error: built.error });
        return await logAuditEvent(supabase, built.value, json);
      }
      case "get_audit_trail":
      case "search_logs":
        if (!hasAnyRole(actor, [...AUDIT_READ_ROLES])) {
          return json(403, { error: "Forbidden - audit trail is admin only" });
        }
        return action === "get_audit_trail"
          ? await getAuditTrail(supabase, params, actor.hospitalId, json)
          : await searchAuditLogs(supabase, params, actor.hospitalId, json);
      default:
        return json(400, { error: "Invalid action" });
    }
  } catch (error) {
    console.error("audit-logger error:", error);
    return json(500, { error: "Internal server error" });
  }
};

type Json = (status: number, payload: Record<string, unknown>) => Response;

async function logAuditEvent(supabase: any, auditRecord: AuditRecord, json: Json) {
  const { error } = await supabase.from("audit_logs").insert(auditRecord);
  if (error) throw error;

  if (auditRecord.severity === "high") {
    await createSecurityAlert(supabase, auditRecord);
  }

  return json(200, { success: true, logged: true });
}

async function getAuditTrail(supabase: any, params: Record<string, unknown>, hospitalId: string, json: Json) {
  let query = supabase
    .from("audit_logs")
    .select("*")
    .eq("hospital_id", hospitalId)
    .order("timestamp", { ascending: false })
    .limit(auditLimit(params.limit));

  if (typeof params.resource_type === "string") query = query.eq("resource_type", params.resource_type);
  if (typeof params.resource_id === "string") query = query.eq("resource_id", params.resource_id);

  const { data, error } = await query;
  if (error) throw error;
  return json(200, { audit_trail: data });
}

async function searchAuditLogs(supabase: any, params: Record<string, unknown>, hospitalId: string, json: Json) {
  let query = supabase
    .from("audit_logs")
    .select("*")
    .eq("hospital_id", hospitalId)
    .order("timestamp", { ascending: false })
    .limit(auditLimit(params.limit ?? 100));

  if (typeof params.user_id === "string") query = query.eq("user_id", params.user_id);
  if (typeof params.action === "string") query = query.eq("action", params.action);
  if (typeof params.start_date === "string") query = query.gte("timestamp", params.start_date);
  if (typeof params.end_date === "string") query = query.lte("timestamp", params.end_date);

  const { data, error } = await query;
  if (error) throw error;
  return json(200, { logs: data, total: data.length });
}

async function createSecurityAlert(supabase: any, auditRecord: AuditRecord) {
  await supabase.from("security_alerts").insert({
    type: "security_event",
    severity: auditRecord.severity,
    message: `High-risk activity: ${auditRecord.action} on ${auditRecord.resource_type}`,
    details: auditRecord,
    timestamp: new Date().toISOString(),
  });
}

serve((req) => withRateLimit(req, handler));
