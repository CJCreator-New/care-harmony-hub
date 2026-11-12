import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getAuthorizedActor } from "../_shared/authorize.ts";
import { validateRequest } from "../_shared/validation.ts";
import { withRateLimit } from "../_shared/rateLimit.ts";
import {
  DEFAULT_FROM_ADDRESS,
  buildFromHeader,
  escapeHtml,
  normalizeRecipients,
  recipientsOutsideAllowlist,
} from "../_shared/emailSafety.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { logEdge } from '../_shared/sanitizeLog.ts';

// S0-06 / EDGE-16: no longer an open relay.
//   - Recipients must be staff of the caller's hospital (profiles.email), max 10.
//   - The body is plain text; the server escapes it into HTML. Caller-supplied
//     `html`, `from` and `replyTo` are not used.
//   - The From address is fixed (NOTIFICATION_FROM_ADDRESS, else the Resend
//     sandbox sender); the display name is the caller's hospital name.
//   - Every send is written to activity_logs.

const emailSchema = z.object({
  to: z.union([z.string(), z.array(z.string())]),
  subject: z.string().min(1).max(200),
  text: z.string().min(1).max(100_000),
  // Accepted for backward compatibility with older clients, ignored.
  html: z.string().optional(),
  from: z.string().optional(),
  replyTo: z.string().optional(),
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

  const { actor, response: authError } = await getAuthorizedActor(req, ["admin", "doctor", "nurse", "receptionist"]);
  if (authError || !actor) return authError ?? json(401, { error: "Unauthorized" });

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return json(500, { error: "Email service not configured" });
  }

  try {
    const validation = await validateRequest(req, emailSchema);
    if (!validation.success) {
      return json(400, { error: "Validation failed", details: validation.error });
    }
    const { to, subject, text } = validation.data;

    const recipients = normalizeRecipients(to);
    if (!recipients.ok) return json(recipients.status, { error: recipients.error });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [{ data: staff, error: staffError }, { data: hospital }] = await Promise.all([
      supabase.from("profiles").select("email").eq("hospital_id", actor.hospitalId).in("email", recipients.value),
      supabase.from("hospitals").select("name").eq("id", actor.hospitalId).maybeSingle(),
    ]);
    if (staffError) throw staffError;

    const outside = recipientsOutsideAllowlist(recipients.value, (staff ?? []).map((s) => s.email as string));
    if (outside.length > 0) {
      return json(403, { error: "Recipients must be staff of your hospital", rejected: outside.length });
    }

    const html = `<div style="font-family: Arial, sans-serif; white-space: pre-wrap;">${escapeHtml(text)
      .replace(/\n/g, "<br>")
      .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")}</div>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: buildFromHeader(hospital?.name, Deno.env.get("NOTIFICATION_FROM_ADDRESS") || DEFAULT_FROM_ADDRESS),
        to: recipients.value,
        subject,
        html,
        text,
      }),
    });

    const result = await response.json().catch(() => ({}));

    await supabase.from("activity_logs").insert({
      hospital_id: actor.hospitalId,
      user_id: actor.userId,
      action_type: "email_sent",
      entity_type: "email",
      entity_id: typeof result?.id === "string" ? result.id : null,
      severity: "info",
      details: { recipient_count: recipients.value.length, subject, delivered: response.ok },
    });

    if (!response.ok) {
      console.error("Resend API error:", response.status);
      return json(502, { error: "Failed to send email" });
    }

    return json(200, { id: result?.id ?? null });
  } catch (error: unknown) {
    logEdge('error', 'send-email', { stage: 'error_in_send_email_function', error: error });
    return json(500, { error: "Internal server error" });
  }
};

serve((req) => withRateLimit(req, handler));
