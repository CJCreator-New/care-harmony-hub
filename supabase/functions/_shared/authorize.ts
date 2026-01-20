import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function authorize(req: Request, allowedRoles: string[]) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = (globalThis as any).Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = (globalThis as any).Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !allowedRoles.includes(profile.role)) {
    return new Response(
      JSON.stringify({ error: "Forbidden - insufficient permissions" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return null;
}
