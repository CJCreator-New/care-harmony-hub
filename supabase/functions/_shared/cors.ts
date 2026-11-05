import { resolveOriginPolicy } from "./corsPolicy.ts";

// Origin policy (EDGE-26):
//   - CORS_ALLOWED_ORIGINS (comma separated) is the allow-list when set.
//   - When it is unset, the localhost allow-list applies only outside production.
//   - In production with CORS_ALLOWED_ORIGINS unset, every browser origin is rejected.
//     Requests without an Origin header (server-to-server) are not affected.
// ENVIRONMENT=production is the existing signal, also used by errorHandler.ts.
const ORIGIN_POLICY = resolveOriginPolicy({
  configuredOrigins: Deno.env.get("CORS_ALLOWED_ORIGINS"),
  environment: Deno.env.get("ENVIRONMENT"),
});

if (ORIGIN_POLICY.source === "none") {
  console.error(
    "[cors] CORS_ALLOWED_ORIGINS is not set in production; browser origins are rejected",
  );
}

const EFFECTIVE_ALLOWED_ORIGINS = ORIGIN_POLICY.allowedOrigins;

const CORS_BASE_HEADERS = {
  // x-correlation-id / x-trace-context: request tracing headers (see _shared/tracing.ts,
  // src/utils/correlationId.ts). Browsers preflight them, so they must be listed (PERF-01).
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-correlation-id, x-trace-context",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const resolveRequestOrigin = (reqOrOrigin?: Request | string | null): string | null => {
  if (!reqOrOrigin) return null;
  if (typeof reqOrOrigin === "string") return reqOrOrigin;
  return reqOrOrigin.headers.get("origin");
};

export const isOriginAllowed = (reqOrOrigin?: Request | string | null): boolean => {
  const origin = resolveRequestOrigin(reqOrOrigin);
  if (!origin) return true; // Allow server-to-server requests with no Origin header.
  return EFFECTIVE_ALLOWED_ORIGINS.includes(origin);
};

/** Per-request CORS headers. Always use this in handlers and helpers. */
export const getCorsHeaders = (req?: Request): Record<string, string> => {
  const requestOrigin = req?.headers.get("origin");
  const allowedOrigin =
    requestOrigin && isOriginAllowed(requestOrigin)
      ? requestOrigin
      : EFFECTIVE_ALLOWED_ORIGINS[0] ?? "null";

  return {
    ...CORS_BASE_HEADERS,
    "Access-Control-Allow-Origin": allowedOrigin,
    Vary: "Origin",
  };
};

/**
 * @deprecated Evaluated once at module load and not tied to a request, so it always
 * carries the first allowed origin. Use getCorsHeaders(req). Kept frozen so that no
 * importer can mutate it for every other caller.
 */
export const corsHeaders: Readonly<Record<string, string>> = Object.freeze(getCorsHeaders());
