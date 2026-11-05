/**
 * PERF-01: the global fetch interceptor must not add non-safelisted headers to
 * cross-origin requests (Supabase REST/Auth/Edge Functions), because the
 * browser then sends a CORS preflight the Edge Functions reject, and
 * `supabase.functions.invoke('phi-crypto', ...)` fails with FunctionsFetchError.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { injectCorrelationIdIntoFetch, registerFetchInterceptor } from '@/utils/correlationId';

const ok = () => Promise.resolve(new Response('{}'));

describe('injectCorrelationIdIntoFetch', () => {
  it('passes cross-origin requests through untouched (same arguments, no extra headers)', async () => {
    const original = vi.fn(ok);
    const wrapped = injectCorrelationIdIntoFetch(original as unknown as typeof fetch);
    const init = { method: 'POST', headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' }, body: '{"action":"decrypt"}' };

    await wrapped('https://abc.supabase.co/functions/v1/phi-crypto', init);

    expect(original).toHaveBeenCalledTimes(1);
    const [url, passedInit] = original.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://abc.supabase.co/functions/v1/phi-crypto');
    expect(passedInit).toBe(init);
    expect(new Headers(passedInit.headers).has('x-correlation-id')).toBe(false);
  });

  it('passes cross-origin Request objects through untouched', async () => {
    const original = vi.fn(ok);
    const wrapped = injectCorrelationIdIntoFetch(original as unknown as typeof fetch);
    const req = new Request('https://rxnav.nlm.nih.gov/REST/interaction/list.json');

    await wrapped(req);

    expect(original).toHaveBeenCalledWith(req, undefined);
  });

  it('tags same-origin requests and keeps body, method and existing headers', async () => {
    const original = vi.fn(ok);
    const wrapped = injectCorrelationIdIntoFetch(original as unknown as typeof fetch);

    await wrapped(`${window.location.origin}/api/logs`, { method: 'POST', body: 'x', headers: { 'Content-Type': 'text/plain' } });
    await wrapped('/relative/path');

    const [, init1] = original.mock.calls[0] as unknown as [string, RequestInit];
    const h1 = new Headers(init1.headers);
    expect(init1.method).toBe('POST');
    expect(init1.body).toBe('x');
    expect(h1.get('content-type')).toBe('text/plain');
    expect(h1.get('x-correlation-id')).toBeTruthy();

    const [, init2] = original.mock.calls[1] as unknown as [string, RequestInit];
    expect(new Headers(init2.headers).get('x-correlation-id')).toBeTruthy();
  });

  it("keeps a same-origin Request's own headers when no init is given", async () => {
    const original = vi.fn(ok);
    const wrapped = injectCorrelationIdIntoFetch(original as unknown as typeof fetch);

    await wrapped(new Request(`${window.location.origin}/x`, { headers: { 'X-Custom': '1' } }));

    const [, init] = original.mock.calls[0] as unknown as [Request, RequestInit];
    const h = new Headers(init.headers);
    expect(h.get('x-custom')).toBe('1');
    expect(h.get('x-correlation-id')).toBeTruthy();
  });
});

describe('registerFetchInterceptor', () => {
  let saved: typeof window.fetch;
  beforeEach(() => {
    saved = window.fetch;
  });
  afterEach(() => {
    window.fetch = saved;
  });

  it('wraps window.fetch only once, however often bootstrap runs', async () => {
    const base = vi.fn(ok);
    window.fetch = base as unknown as typeof fetch;

    registerFetchInterceptor();
    const first = window.fetch;
    registerFetchInterceptor();
    registerFetchInterceptor();

    expect(window.fetch).toBe(first);
    expect(window.fetch).not.toBe(base);
    await window.fetch('/same-origin');
    expect(base).toHaveBeenCalledTimes(1);
  });
});
