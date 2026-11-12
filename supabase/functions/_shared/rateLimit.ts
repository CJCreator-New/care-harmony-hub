// Rate limiting middleware for Supabase Edge Functions.
//
// Keying (EDGE-11):
//   - A user id from a verified token (checked against GoTrue /auth/v1/user) keys the bucket.
//   - Anything else (anonymous, anon key, invalid token) is keyed on the client IP, taken
//     from the first x-forwarded-for hop. This is best effort: it relies on the gateway
//     setting the header, and a client that controls it can rotate its bucket.
//   - The store is per isolate and resets on cold start. A durable store (Postgres or
//     Redis) is still outstanding under S2-07.
//
// Pure key and decision logic lives in rateLimitKey.ts and is unit-tested.
import {
  consumeRateLimit,
  deriveRateLimitKey,
  type RateLimitBucket,
  type RateLimitConfigInput,
  type RateLimitDecision,
} from "./rateLimitKey.ts";
import { jsonResponse, withResponseHeader } from "./response.ts";

export type { RateLimitConfigInput, RateLimitDecision } from "./rateLimitKey.ts";

const store = new Map<string, RateLimitBucket>();

export function rateLimit(id: string, config?: RateLimitConfigInput): RateLimitDecision {
  return consumeRateLimit(store, id, config, Date.now());
}

/** Sync key helper. Pass a userId only when it came from a verified token. */
export function getIdentifier(req: Request, verifiedUserId?: string | null): string {
  return deriveRateLimitKey({
    verifiedUserId,
    forwardedFor: req.headers.get("x-forwarded-for"),
  });
}

/**
 * Returns the verified user id for a bearer token, or null. Never throws: any failure
 * (no token, the anon key, an invalid token, missing env) falls back to IP keying.
 */
export async function resolveVerifiedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return null;
  // The anon key is a JWT too, but it is not a user. Skip the lookup for it.
  if (token === Deno.env.get("SUPABASE_ANON_KEY")) return null;

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { id?: unknown };
    return typeof body?.id === "string" && body.id.length > 0 ? body.id : null;
  } catch {
    return null;
  }
}

export async function withRateLimit(
  req: Request,
  handler: (req: Request) => Promise<Response>,
  config?: RateLimitConfigInput,
): Promise<Response> {
  try {
    const verifiedUserId = await resolveVerifiedUserId(req);
    const result = rateLimit(getIdentifier(req, verifiedUserId), config);
    if (!result.allowed) {
      return jsonResponse(req, 429, { error: "Rate limit exceeded" }, {
        "Retry-After": String(result.retryAfterSeconds),
      });
    }

    const response = await handler(req);
    if (!(response instanceof Response)) {
      console.error("[rateLimit] handler did not return a Response");
      return jsonResponse(req, 500, { error: "Internal server error" });
    }
    return withResponseHeader(response, "X-RateLimit-Remaining", String(result.remaining));
  } catch (error) {
    console.error("[rateLimit] handler failed", error instanceof Error ? error.name : "unknown");
    return jsonResponse(req, 500, { error: "Internal server error" });
  }
}
