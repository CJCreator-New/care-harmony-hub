// Response for edge functions that have been retired (roadmap S0-10).
//
// The custom TOTP functions (generate-2fa-secret, verify-2fa, verify-totp,
// store-2fa-secret) are replaced by Supabase Auth MFA (TOTP factors, aal2 in the
// JWT). They now answer 410 Gone so that nothing can mint, store or "verify" a
// second factor outside Supabase Auth (EDGE-05, EDGE-12, EDGE-25).
import { getCorsHeaders, isOriginAllowed } from "./cors.ts";

export function retiredFunctionResponse(req: Request, name: string, replacement: string): Response {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (!isOriginAllowed(req)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
  return new Response(
    JSON.stringify({
      success: false,
      error: "gone",
      message: `${name} has been retired. ${replacement}`,
    }),
    { status: 410, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors } },
  );
}
