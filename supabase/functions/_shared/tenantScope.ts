/**
 * Tenant-scoping rules for edge functions that use the service-role key
 * (roadmap S0-06: EDGE-06/07/08/09/13/14/16/22).
 *
 * The service-role client bypasses RLS, so every function must prove that each
 * id it reads from the request body belongs to the caller's hospital before it
 * reads or writes the row. This module holds those checks in one place.
 *
 * Rules:
 *   - The actor (user id, profile id, hospital, roles) comes from the verified JWT
 *     and the database (see authorize.ts), never from the request body.
 *   - An actor without a hospital is refused (fail closed, EDGE-14).
 *   - Roles granted for another hospital do not count (EDGE-14).
 *   - A body-supplied hospital_id that differs from the actor's is refused.
 *   - Every body-supplied patient / profile / row id is resolved with
 *     `.eq('hospital_id', actor.hospitalId)` before use (EDGE-13).
 *   - Writes take an explicit column allowlist; server-owned columns are rejected
 *     (EDGE-08 mass assignment).
 *
 * This file must stay free of imports, I/O and Deno/Node globals so it runs in
 * both runtimes and can be unit-tested with vitest (tests/edge-tenant-scope/).
 * The async helpers take a duck-typed query client so tests can pass a fake.
 */

// ---------------------------------------------------------------------------
// Actor resolution (used by authorize.ts)
// ---------------------------------------------------------------------------

export type RoleRow = { role: string | null; hospital_id: string | null };

/**
 * Roles that apply in `hospitalId`: rows for that hospital, plus legacy rows with
 * a NULL hospital_id (some migrations and the seed inserted roles without one).
 * Rows for any other hospital are dropped. Duplicates are removed.
 *
 * NULL-hospital rows are accepted only so existing accounts keep working; once
 * user_roles.hospital_id is backfilled and NOT NULL, set
 * ACCEPT_UNSCOPED_LEGACY_ROLES to false.
 */
export const ACCEPT_UNSCOPED_LEGACY_ROLES = true;

export function rolesForHospital(
  rows: readonly RoleRow[] | null | undefined,
  hospitalId: string | null | undefined,
  acceptUnscoped: boolean = ACCEPT_UNSCOPED_LEGACY_ROLES,
): string[] {
  if (!hospitalId) return [];
  const out: string[] = [];
  for (const row of rows ?? []) {
    if (!row || typeof row.role !== "string" || row.role.length === 0) continue;
    const scoped = row.hospital_id === hospitalId || (acceptUnscoped && row.hospital_id == null);
    if (scoped && !out.includes(row.role)) out.push(row.role);
  }
  return out;
}

export type ActorDecision =
  | { ok: true; assignedRoles: string[]; matchedRoles: string[] }
  | { ok: false; status: 403; error: string };

export const NO_HOSPITAL_ERROR = "Forbidden - caller has no hospital";
export const INSUFFICIENT_ROLE_ERROR = "Forbidden - insufficient permissions";

/**
 * Decide whether a verified user may act, given their profile's hospital and
 * their user_roles rows. Fails closed when the hospital is missing. The error
 * never echoes the caller's roles.
 */
export function decideActorAccess(input: {
  profileHospitalId: string | null | undefined;
  roleRows: readonly RoleRow[] | null | undefined;
  allowedRoles: readonly string[];
}): ActorDecision {
  if (!input.profileHospitalId) {
    return { ok: false, status: 403, error: NO_HOSPITAL_ERROR };
  }
  const assignedRoles = rolesForHospital(input.roleRows, input.profileHospitalId);
  const matchedRoles = assignedRoles.filter((r) => input.allowedRoles.includes(r));
  if (matchedRoles.length === 0) {
    return { ok: false, status: 403, error: INSUFFICIENT_ROLE_ERROR };
  }
  return { ok: true, assignedRoles, matchedRoles };
}

/** Minimal actor shape the helpers below need (a subset of AuthorizedActor). */
export type ScopedActor = {
  userId: string;
  profileId: string | null;
  hospitalId: string;
  assignedRoles: readonly string[];
};

export function hasAnyRole(actor: Pick<ScopedActor, "assignedRoles">, roles: readonly string[]): boolean {
  return actor.assignedRoles.some((r) => roles.includes(r));
}

/**
 * True when `claimedId` names the actor. Tables disagree on whether "doctor_id"
 * holds auth.users.id or profiles.id, so both are accepted. Empty never matches.
 */
export function isActorIdentity(
  actor: Pick<ScopedActor, "userId" | "profileId">,
  claimedId: unknown,
): boolean {
  if (typeof claimedId !== "string" || claimedId.length === 0) return false;
  return claimedId === actor.userId || (actor.profileId != null && claimedId === actor.profileId);
}

// ---------------------------------------------------------------------------
// Body checks
// ---------------------------------------------------------------------------

/**
 * A body may repeat the caller's hospital (old clients send it) but may not name
 * another one. Absent / null / empty is fine: the actor's hospital is used.
 */
export function checkBodyHospital(
  actorHospitalId: string,
  bodyHospitalId: unknown,
): { ok: true } | { ok: false; status: 403; error: string } {
  if (bodyHospitalId === undefined || bodyHospitalId === null || bodyHospitalId === "") {
    return { ok: true };
  }
  if (bodyHospitalId !== actorHospitalId) {
    return { ok: false, status: 403, error: "Forbidden - hospital scope mismatch" };
  }
  return { ok: true };
}

/** A row read through the service-role client belongs to the caller's hospital. */
export function rowInHospital(row: unknown, hospitalId: string): boolean {
  if (!row || typeof row !== "object" || !hospitalId) return false;
  return (row as { hospital_id?: unknown }).hospital_id === hospitalId;
}

/**
 * Copy only allowlisted keys from `body`. Any other key is an error (strict),
 * so a caller cannot set hospital_id, pharmacist_id, created_at, etc.
 * `undefined` values are dropped. Returns the rejected keys for the 400 body.
 */
export function pickAllowedFields(
  body: unknown,
  allowed: readonly string[],
): { ok: true; value: Record<string, unknown> } | { ok: false; status: 400; error: string; fields: string[] } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "Request body must be a JSON object", fields: [] };
  }
  const value: Record<string, unknown> = {};
  const rejected: string[] = [];
  for (const [key, v] of Object.entries(body as Record<string, unknown>)) {
    if (!allowed.includes(key)) {
      rejected.push(key);
      continue;
    }
    if (v !== undefined) value[key] = v;
  }
  if (rejected.length > 0) {
    return {
      ok: false,
      status: 400,
      error: `Fields not allowed: ${rejected.sort().join(", ")}`,
      fields: rejected,
    };
  }
  return { ok: true, value };
}

/** Integer in [min, max]; anything unparsable becomes `fallback`. */
export function clampInt(value: unknown, opts: { min: number; max: number; fallback: number }): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return opts.fallback;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(n)));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * workflow-automation (EDGE-07): the nested record that drives writes is pinned
 * to the actor's hospital. A record naming another hospital is refused.
 */
export function scopeRecordData(
  recordData: unknown,
  actorHospitalId: string,
): { ok: true; value: Record<string, unknown> } | { ok: false; status: 400 | 403; error: string } {
  if (recordData !== undefined && recordData !== null && (typeof recordData !== "object" || Array.isArray(recordData))) {
    return { ok: false, status: 400, error: "record_data must be an object" };
  }
  const rec = (recordData ?? {}) as Record<string, unknown>;
  const hospital = checkBodyHospital(actorHospitalId, rec.hospital_id);
  if (!hospital.ok) return hospital;
  return { ok: true, value: { ...rec, hospital_id: actorHospitalId } };
}

// ---------------------------------------------------------------------------
// Database lookups pinned to the caller's hospital (duck-typed client)
// ---------------------------------------------------------------------------

type QueryResult = { data: unknown; error: unknown };
type Filterable = {
  eq(column: string, value: unknown): Filterable;
  maybeSingle(): PromiseLike<QueryResult>;
};
export type TenantDb = {
  from(table: string): { select(columns: string): Filterable };
};

/**
 * Fetch one row of `table` whose `column` equals `id` AND whose hospital_id is
 * the caller's. Returns null for "not found", "other hospital" and query errors
 * alike, so callers answer 403/404 without leaking which.
 */
export async function findInHospital<T extends Record<string, unknown> = Record<string, unknown>>(
  db: TenantDb,
  table: string,
  id: unknown,
  hospitalId: string,
  opts: { column?: string; select?: string } = {},
): Promise<T | null> {
  if (typeof id !== "string" || id.length === 0 || !hospitalId) return null;
  const column = opts.column ?? "id";
  const select = opts.select ?? "id, hospital_id";
  const { data, error } = await db
    .from(table)
    .select(select.includes("hospital_id") ? select : `${select}, hospital_id`)
    .eq(column, id)
    .eq("hospital_id", hospitalId)
    .maybeSingle();
  if (error || !data) return null;
  // Belt and braces: never trust a row whose hospital differs, whatever the query did.
  if (!rowInHospital(data, hospitalId)) return null;
  return data as T;
}

/** EDGE-13: a body patient id must name a patient of the caller's hospital. */
export async function assertPatientInHospital(db: TenantDb, patientId: unknown, hospitalId: string): Promise<boolean> {
  if (!isUuid(patientId)) return false;
  return (await findInHospital(db, "patients", patientId, hospitalId)) !== null;
}

/**
 * EDGE-13: a body staff id must name a profile of the caller's hospital.
 * Accepts either profiles.id or profiles.user_id (call sites disagree).
 */
export async function findProfileInHospital<T extends Record<string, unknown> = Record<string, unknown>>(
  db: TenantDb,
  idOrUserId: unknown,
  hospitalId: string,
  select = "id, user_id, hospital_id",
): Promise<T | null> {
  if (!isUuid(idOrUserId)) return null;
  const byId = await findInHospital<T>(db, "profiles", idOrUserId, hospitalId, { select });
  if (byId) return byId;
  return findInHospital<T>(db, "profiles", idOrUserId, hospitalId, { column: "user_id", select });
}
