/**
 * audit-logger rules (roadmap S0-06, EDGE-09).
 *
 *   - The audit subject is always the verified caller: user_id and hospital_id
 *     come from the JWT-derived actor. user_id, hospital_id, timestamp, severity,
 *     ip_address and user_agent in the request body are ignored.
 *   - Reading the audit trail is limited to AUDIT_READ_ROLES and capped at
 *     AUDIT_MAX_LIMIT rows.
 *
 * Pure module (no imports, no I/O) so vitest can test it; see
 * tests/edge-tenant-scope/auditEvent.test.ts.
 */

export const AUDIT_READ_ROLES = ["admin"] as const;
export const AUDIT_WRITE_ROLES = ["admin", "doctor", "nurse", "receptionist", "pharmacist", "lab_technician"] as const;
export const AUDIT_DEFAULT_LIMIT = 50;
export const AUDIT_MAX_LIMIT = 500;

export function getSeverityLevel(action: string, resourceType: string): "low" | "medium" | "high" {
  const highRiskActions = ["delete", "export", "bulk_update", "admin_access"];
  const criticalResources = ["patients", "medical_records", "prescriptions"];

  if (highRiskActions.some((a) => action.includes(a))) return "high";
  if (criticalResources.includes(resourceType) && action === "view") return "medium";
  if (action.includes("login") || action.includes("logout")) return "low";
  return "medium";
}

export type AuditContext = {
  userId: string;
  hospitalId: string;
  ipAddress: string;
  userAgent: string;
  now: Date;
};

export type AuditRecord = {
  user_id: string;
  hospital_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  session_id: string | null;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  severity: "low" | "medium" | "high";
};

function shortString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

/**
 * Build the row to insert from a caller-supplied event. Only action,
 * resource_type, resource_id, details and session_id are taken from the body.
 */
export function buildAuditRecord(
  event: unknown,
  ctx: AuditContext,
): { ok: true; value: AuditRecord } | { ok: false; status: 400; error: string } {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return { ok: false, status: 400, error: "events must be an object" };
  }
  const e = event as Record<string, unknown>;
  const action = shortString(e.action, 100);
  const resourceType = shortString(e.resource_type, 100);
  if (!action || !resourceType) {
    return { ok: false, status: 400, error: "action and resource_type are required (max 100 chars)" };
  }
  const resourceId = e.resource_id === undefined || e.resource_id === null ? null : shortString(String(e.resource_id), 200);
  const details =
    e.details && typeof e.details === "object" && !Array.isArray(e.details)
      ? (e.details as Record<string, unknown>)
      : {};
  const sessionId = shortString(e.session_id, 200);

  return {
    ok: true,
    value: {
      user_id: ctx.userId,
      hospital_id: ctx.hospitalId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      session_id: sessionId,
      ip_address: ctx.ipAddress,
      user_agent: ctx.userAgent,
      timestamp: ctx.now.toISOString(),
      severity: getSeverityLevel(action, resourceType),
    },
  };
}

/** Requested page size, defaulted and capped. */
export function auditLimit(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 1) return AUDIT_DEFAULT_LIMIT;
  return Math.min(AUDIT_MAX_LIMIT, Math.trunc(n));
}
