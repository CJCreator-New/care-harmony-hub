import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function authorize(req: Request, allowedRoles: string[]) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  // Use the service role key for server-side JWT verification.
  // The user's bearer token is verified via getUser(); never used as auth key.
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Verify the caller's JWT using the admin client.
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Roles live in user_roles (keyed by user_id), not in the profiles table.
  const { data: roleRow } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!roleRow || !allowedRoles.includes(roleRow.role)) {
    return new Response(
      JSON.stringify({ error: "Forbidden - insufficient permissions" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return null;
}
