/**
 * PERF-01: every request header the web client can send to an Edge Function
 * must be in the shared CORS allow-list, or the browser blocks the call at the
 * preflight (observed: "Request header field x-correlation-id is not allowed by
 * Access-Control-Allow-Headers in preflight response").
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';

let getCorsHeaders: (req?: Request) => Record<string, string>;

beforeAll(async () => {
  vi.stubGlobal('Deno', { env: { get: () => undefined } });
  ({ getCorsHeaders } = await import('../../supabase/functions/_shared/cors.ts'));
});

describe('_shared/cors.ts Access-Control-Allow-Headers', () => {
  it('allows the supabase-js headers and the tracing headers', () => {
    const allowed = getCorsHeaders(new Request('https://x.supabase.co/functions/v1/phi-crypto', {
      headers: { origin: 'http://localhost:5173' },
    }))['Access-Control-Allow-Headers']
      .split(',')
      .map((h) => h.trim().toLowerCase());

    for (const header of ['authorization', 'apikey', 'content-type', 'x-client-info', 'x-correlation-id', 'x-trace-context']) {
      expect(allowed).toContain(header);
    }
  });

  it('allows POST and OPTIONS (functions.invoke default method and preflight)', () => {
    const methods = getCorsHeaders()['Access-Control-Allow-Methods'];
    expect(methods).toMatch(/POST/);
    expect(methods).toMatch(/OPTIONS/);
  });
});
