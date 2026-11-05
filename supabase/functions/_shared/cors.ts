const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const ALLOWED_ORIGINS = (Deno.env.get("CORS_ALLOWED_ORIGINS") || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const EFFECTIVE_ALLOWED_ORIGINS =
  ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : DEFAULT_ALLOWED_ORIGINS;

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

// Backward compatibility for functions that still spread `corsHeaders`.
export const corsHeaders = getCorsHeaders();
