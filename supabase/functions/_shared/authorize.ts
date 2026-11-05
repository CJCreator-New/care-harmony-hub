import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "./cors.ts";
import { decideActorAccess, type RoleRow } from "./tenantScope.ts";

/**
 * The caller of an edge function, derived from the verified JWT and the database.
 * Never build one from the request body.
 *
 * S0-06 / EDGE-14 changes (backward compatible for existing callers):
 *   - hospitalId is never null: an actor without a hospital gets 403.
 *   - assignedRoles/matchedRoles only contain roles granted for the actor's
 *     hospital (plus legacy rows with a NULL hospital_id, see tenantScope.ts).
 *   - The 403 body no longer echoes the caller's roles.
 *   - profileId (profiles.id) is returned for columns that reference profiles.
 *   - Error responses carry CORS headers so browsers can read them.
 */
export type AuthorizedActor = {
  userId: string;
  profileId: string | null;
  email: string | null;
  hospitalId: string;
  assignedRoles: string[];
  matchedRoles: string[];
  correlationId: string | null;
};

type AuthorizationResult = {
  actor: AuthorizedActor | null;
  response: Response | null;
};

function jsonResponse(req: Request, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

export async function getAuthorizedActor(
  req: Request,
  allowedRoles: string[],
): Promise<AuthorizationResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      actor: null,
      response: jsonResponse(req, 401, { error: "Missing authorization header" }),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(token);

  if (authError || !user) {
    return {
      actor: null,
      response: jsonResponse(req, 401, { error: "Unauthorized" }),
    };
  }

  const [{ data: roleRows, error: roleError }, { data: profile, error: profileError }] = await Promise.all([
    adminClient
      .from("user_roles")
      .select("role, hospital_id")
      .eq("user_id", user.id),
    adminClient
      .from("profiles")
      .select("id, hospital_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (roleError || profileError) {
    return {
      actor: null,
      response: jsonResponse(req, 500, { error: "Failed to load authorization context" }),
    };
  }

  const hospitalId = (profile?.hospital_id as string | null | undefined) ?? null;
  const decision = decideActorAccess({
    profileHospitalId: hospitalId,
    roleRows: (roleRows ?? []) as RoleRow[],
    allowedRoles,
  });

  if (!decision.ok) {
    return {
      actor: null,
      response: jsonResponse(req, decision.status, { error: decision.error }),
    };
  }

  return {
    actor: {
      userId: user.id,
      profileId: (profile?.id as string | null | undefined) ?? null,
      email: user.email ?? null,
      hospitalId: hospitalId as string,
      assignedRoles: decision.assignedRoles,
      matchedRoles: decision.matchedRoles,
      correlationId: req.headers.get("X-Correlation-Id"),
    },
    response: null,
  };
}

export async function authorize(req: Request, allowedRoles: string[]) {
  const { response } = await getAuthorizedActor(req, allowedRoles);
  return response;
}
