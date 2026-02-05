import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { rateLimit, getIdentifier } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ValidateTokenRequest {
  token: string;
}

const INVITATION_RATE_LIMIT = { windowMs: 5 * 60 * 1000, maxRequests: 10 };
const TOKEN_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const rateResult = rateLimit(getIdentifier(req), INVITATION_RATE_LIMIT);
    if (!rateResult.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((rateResult.resetTime - Date.now()) / 1000)),
            ...corsHeaders,
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token }: ValidateTokenRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate token format (UUID expected)
    if (typeof token !== "string" || !TOKEN_UUID_REGEX.test(token)) {
      await supabase.rpc("log_security_event", {
        p_user_id: null,
        p_event_type: "invitation_token_invalid",
        p_user_agent: req.headers.get("user-agent"),
        p_ip_address: req.headers.get("x-forwarded-for") ?? null,
        p_details: { token_length: token?.length || 0 },
        p_severity: "warning",
      }).catch(() => {});

      return new Response(
        JSON.stringify({ error: "Invalid token format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Query invitation with rate limiting consideration
    // Note: This uses service role key, so RLS is bypassed for security
    const { data: invitation, error } = await supabase
      .from("staff_invitations")
      .select(`
        id,
        email,
        role,
        hospital_id,
        status,
        expires_at,
        hospital:hospitals(name)
      `)
      .eq("token", token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!invitation) {
      await supabase.rpc("log_security_event", {
        p_user_id: null,
        p_event_type: "invitation_token_not_found",
        p_user_agent: req.headers.get("user-agent"),
        p_ip_address: req.headers.get("x-forwarded-for") ?? null,
        p_details: { token_fingerprint: token.slice(0, 8) },
        p_severity: "warning",
      }).catch(() => {});

      return new Response(
        JSON.stringify({ error: "Invalid or expired invitation" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Return invitation details (without sensitive token)
    const { token: _, ...safeInvitation } = invitation;

    return new Response(
      JSON.stringify({
        valid: true,
        invitation: safeInvitation
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in validate-invitation-token function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
