import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AuthorizedActor = {
  userId: string;
  email: string | null;
  hospitalId: string | null;
  assignedRoles: string[];
  matchedRoles: string[];
  correlationId: string | null;
};

type AuthorizationResult = {
  actor: AuthorizedActor | null;
  response: Response | null;
};

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
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
      response: jsonResponse(401, { error: "Missing authorization header" }),
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
      response: jsonResponse(401, { error: "Unauthorized" }),
    };
  }

  const [{ data: roleRows, error: roleError }, { data: profile, error: profileError }] = await Promise.all([
    adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id),
    adminClient
      .from("profiles")
      .select("hospital_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (roleError || profileError) {
    return {
      actor: null,
      response: jsonResponse(500, { error: "Failed to load authorization context" }),
    };
  }

  const assignedRoles = (roleRows ?? []).map((row) => row.role as string);
  const matchedRoles = assignedRoles.filter((role) => allowedRoles.includes(role));

  if (matchedRoles.length === 0) {
    return {
      actor: null,
      response: jsonResponse(403, {
        error: "Forbidden - insufficient permissions",
        assignedRoles,
      }),
    };
  }

  return {
    actor: {
      userId: user.id,
      email: user.email ?? null,
      hospitalId: (profile?.hospital_id as string | null | undefined) ?? null,
      assignedRoles,
      matchedRoles,
      correlationId: req.headers.get("X-Correlation-Id"),
    },
    response: null,
  };
}

export async function authorize(req: Request, allowedRoles: string[]) {
  const { response } = await getAuthorizedActor(req, allowedRoles);
  return response;
}
