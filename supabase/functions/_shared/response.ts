// Response helpers shared by every edge function. Each response is built per request,
// so CORS headers always reflect the caller's Origin (never module-level state).
import { getCorsHeaders } from "./cors.ts";

export function jsonResponse(
  req: Request | null | undefined,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req ?? undefined),
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

/**
 * Returns a copy of `response` with one extra header. Responses produced by fetch()
 * or Response.redirect() have immutable headers, so `headers.set` on them throws.
 */
export function withResponseHeader(response: Response, name: string, value: string): Response {
  const headers = new Headers(response.headers);
  headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
