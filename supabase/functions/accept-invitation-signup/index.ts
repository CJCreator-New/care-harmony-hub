import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders, isOriginAllowed } from "../_shared/cors.ts";
import { validateRequest } from "../_shared/validation.ts";
import { rateLimit, getIdentifier, withRateLimit } from "../_shared/rateLimit.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const requestSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
});

const ACCEPT_INVITATION_RATE_LIMIT = { windowMs: 10 * 60 * 1000, maxRequests: 8 };

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

  const rateLimitIdentifier = `${getIdentifier(req)}:${req.headers.get("user-agent") ?? "unknown"}`;
  const rateResult = rateLimit(rateLimitIdentifier, ACCEPT_INVITATION_RATE_LIMIT);
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

  const validation = await validateRequest(req, requestSchema);
  if (!validation.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", details: validation.error }),
      { status: 400, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
    );
  }

  const { token, password, firstName, lastName } = validation.data;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("staff_invitations")
      .select("id, email, role, hospital_id, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (invitationError) {
      console.error("Invitation lookup error:", invitationError);
      return new Response(
        JSON.stringify({ error: "Unable to process invitation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
      );
    }

    if (!invitation || invitation.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Unable to accept invitation" }),
        { status: 400, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
      );
    }

    if (new Date(invitation.expires_at).getTime() <= Date.now()) {
      return new Response(
        JSON.stringify({ error: "Unable to accept invitation" }),
        { status: 400, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
      );
    }

    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (createUserError || !createdUser.user) {
      return new Response(
        JSON.stringify({ error: "Unable to accept invitation" }),
        { status: 400, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
      );
    }

    const userId = createdUser.user.id;

    const { data: acceptance, error: acceptError } = await supabaseAdmin.rpc(
      "accept_staff_invitation",
      {
        p_token: token,
        p_user_id: userId,
        p_first_name: firstName,
        p_last_name: lastName,
        p_email: invitation.email,
      }
    );

    if (acceptError) {
      console.error("Invitation acceptance error:", acceptError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to complete invitation acceptance" }),
        { status: 500, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
      );
    }

    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: invitation.email,
      password,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({
          success: true,
          requires_login: true,
          user_id: userId,
          invitation: acceptance,
          warning: "Account created but sign-in failed",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        requires_login: false,
        user_id: userId,
        invitation: acceptance,
        session: signInData.session,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
    );
  } catch (error: unknown) {
    console.error("accept-invitation-signup error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to process invitation" }),
      { status: 500, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
    );
  }
};

serve((req) => withRateLimit(req, handler, { limit: 8, windowMs: 600000 }));
