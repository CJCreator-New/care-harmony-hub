/**
 * Outbound email rules for send-email and send-notification (roadmap S0-06, EDGE-16).
 *
 *   - Every interpolated value is HTML-escaped.
 *   - The From address is fixed by the server; the display name comes from the
 *     caller's hospital row, stripped of header-breaking characters.
 *   - Recipients are normalised, de-duplicated and capped, and must appear in an
 *     allowlist the caller builds from the database for the actor's hospital
 *     (staff or patient emails). Arbitrary external addresses are refused.
 *
 * Pure module (no imports, no I/O); tested in tests/edge-tenant-scope/emailSafety.test.ts.
 */

export const MAX_EMAIL_RECIPIENTS = 10;
export const DEFAULT_FROM_ADDRESS = "onboarding@resend.dev";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** A display name safe to place in a From header: no CR/LF, quotes, angle brackets or backslashes. */
export function sanitizeDisplayName(value: unknown, fallback = "CareSync"): string {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[\r\n"<>\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return cleaned.length > 0 ? cleaned : fallback;
}

/** `Name <address>` with a sanitised name and a server-chosen address. */
export function buildFromHeader(displayName: unknown, address: string = DEFAULT_FROM_ADDRESS): string {
  return `${sanitizeDisplayName(displayName)} <${address}>`;
}

const EMAIL_RE = /^[^\s@<>()",;:\\]+@[^\s@<>()",;:\\]+\.[^\s@<>()",;:\\]+$/;

export function normalizeRecipients(
  to: unknown,
  max: number = MAX_EMAIL_RECIPIENTS,
): { ok: true; value: string[] } | { ok: false; status: 400; error: string } {
  const list = Array.isArray(to) ? to : [to];
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") return { ok: false, status: 400, error: "Recipient must be an email address" };
    const email = item.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { ok: false, status: 400, error: "Recipient must be an email address" };
    if (!out.includes(email)) out.push(email);
  }
  if (out.length === 0) return { ok: false, status: 400, error: "At least one recipient is required" };
  if (out.length > max) return { ok: false, status: 400, error: `At most ${max} recipients are allowed` };
  return { ok: true, value: out };
}

/** Recipients that are not in the allowlist (case-insensitive). Empty means all allowed. */
export function recipientsOutsideAllowlist(recipients: readonly string[], allowed: readonly (string | null | undefined)[]): string[] {
  const allow = new Set(allowed.filter((a): a is string => typeof a === "string").map((a) => a.trim().toLowerCase()));
  return recipients.filter((r) => !allow.has(r.trim().toLowerCase()));
}
