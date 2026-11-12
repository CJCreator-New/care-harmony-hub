// Pure CORS origin policy. No Deno APIs, so it can be unit-tested under vitest.
// cors.ts reads CORS_ALLOWED_ORIGINS and ENVIRONMENT (the variables already used
// elsewhere in the edge layer) and passes them in here.

export const DEV_ALLOWED_ORIGINS: readonly string[] = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

export function parseOriginList(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export interface OriginPolicyInput {
  /** Raw CORS_ALLOWED_ORIGINS value (comma separated). */
  configuredOrigins: string | null | undefined;
  /** Raw ENVIRONMENT value. Only the exact string "production" is treated as production. */
  environment: string | null | undefined;
}

export interface OriginPolicy {
  allowedOrigins: string[];
  /**
   * configured: CORS_ALLOWED_ORIGINS is set and used.
   * dev-default: not set and not production, so the localhost allow-list applies.
   * none: not set in production. Every browser origin is rejected (fail closed).
   */
  source: "configured" | "dev-default" | "none";
}

export function resolveOriginPolicy(input: OriginPolicyInput): OriginPolicy {
  const configured = parseOriginList(input.configuredOrigins);
  if (configured.length > 0) {
    return { allowedOrigins: configured, source: "configured" };
  }
  if (input.environment === "production") {
    return { allowedOrigins: [], source: "none" };
  }
  return { allowedOrigins: [...DEV_ALLOWED_ORIGINS], source: "dev-default" };
}
