import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { rateLimit, getIdentifier, withRateLimit } from "../_shared/rateLimit.ts";
import { getCorsHeaders, isOriginAllowed } from "../_shared/cors.ts";
import { validateRequest } from "../_shared/validation.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const inviteTokenSchema = z.object({
  token: z.string().min(1),
});

interface ValidateTokenRequest {
  token: string;
}

const INVITATION_RATE_LIMIT = { windowMs: 5 * 60 * 1000, maxRequests: 10 };
const TOKEN_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const maskEmail = (email: string): string => {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "";
  return `${localPart.slice(0, 1)}***@${domain}`;
};

const invalidInvitationResponse = (headers: Record<string, string>) =>
  new Response(JSON.stringify({ valid: false }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });

const handler = async (req: Request): Promise<Response> => {
  const reqCorsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: reqCorsHeaders });
  }

  if (!isOriginAllowed(req)) {
    return new Response(
      JSON.stringify({ error: "Origin not allowed" }),
      { status: 403, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
    );
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
    );
  }

  try {
    const rateLimitIdentifier = `${getIdentifier(req)}:${req.headers.get("user-agent") ?? "unknown"}`;
    const rateResult = rateLimit(rateLimitIdentifier, INVITATION_RATE_LIMIT);
    if (!rateResult.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((rateResult.resetTime - Date.now()) / 1000)),
            ...reqCorsHeaders,
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const validation = await validateRequest(req, inviteTokenSchema);
    if (!validation.success) {
      return invalidInvitationResponse(reqCorsHeaders);
    }
    const { token } = validation.data;

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

      return invalidInvitationResponse(reqCorsHeaders);
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
        JSON.stringify({ error: "Unable to validate invitation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
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

      return invalidInvitationResponse(reqCorsHeaders);
    }

    const safeInvitation = {
      id: invitation.id,
      email: maskEmail(invitation.email),
      role: invitation.role,
      hospital_id: invitation.hospital_id,
      hospital: invitation.hospital,
    };

    return new Response(
      JSON.stringify({
        valid: true,
        invitation: safeInvitation
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          ...reqCorsHeaders,
        },
      }
    );

  } catch (error: unknown) {
    console.error("Error in validate-invitation-token function:", error);
    return new Response(
      JSON.stringify({ error: "Unable to validate invitation" }),
      { status: 500, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
    );
  }
};

serve((req) => withRateLimit(req, handler, { limit: 10, windowMs: 300000 }));
