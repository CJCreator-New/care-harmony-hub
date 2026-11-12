/**
 * Network guard and login for the staging clinical smoke test.
 *
 * One route handler per browser context:
 *   1. Requests to a production host are aborted and recorded (the test then fails).
 *   2. Test-specific rules run next (simulate an outage, capture a write, patch a response).
 *   3. Supabase writes are aborted and recorded, so the test leaves no clinical
 *      data behind. Reads, edge functions (phi-crypto), auth, and the
 *      append-only activity/audit logs pass through.
 */

import { expect, type APIResponse, type BrowserContext, type Page, type Request, type Route } from '@playwright/test';
import { isProductionHost, type StagingEnv, type StagingRole } from './staging-env';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
/** Append-only logging; letting these through keeps the staging audit trail honest. */
const ALLOWED_WRITE_TABLES = new Set(['activity_logs', 'audit_logs']);
/** RPCs that only read (or only log). Anything else is treated as a write. */
const READ_ONLY_RPC = /^(get_|check_|predict_|detect_|calculate_|has_|is_|log_security_event$)/;

export type RuleAction =
  | { kind: 'abort' }
  | { kind: 'fulfill'; status: number; body?: string; contentType?: string }
  | { kind: 'transform'; mutate: (json: unknown) => unknown };

export interface NetworkRule {
  readonly name: string;
  readonly match: (req: Request, url: URL) => boolean;
  readonly action: RuleAction;
}

export interface RecordedRequest {
  readonly rule: string;
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
}

const safeBody = (req: Request): unknown => {
  try {
    return req.postDataJSON();
  } catch {
    return req.postData();
  }
};

export class StagingNetwork {
  readonly productionViolations: string[] = [];
  readonly blockedWrites: RecordedRequest[] = [];
  readonly ruleHits: RecordedRequest[] = [];
  private readonly rules: NetworkRule[] = [];
  private readonly expectedSupabaseHost?: string;

  constructor(env: StagingEnv) {
    this.expectedSupabaseHost = env.supabaseUrl ? new URL(env.supabaseUrl).hostname.toLowerCase() : undefined;
  }

  addRule(rule: NetworkRule): void {
    this.rules.push(rule);
  }

  hits(ruleName: string): RecordedRequest[] {
    return this.ruleHits.filter((h) => h.rule === ruleName);
  }

  async install(context: BrowserContext): Promise<void> {
    await context.route('**/*', (route) => this.handle(route));
    const watchSockets = (page: Page) =>
      page.on('websocket', (ws) => {
        try {
          const host = new URL(ws.url()).hostname;
          if (isProductionHost(host) || this.isUnexpectedSupabase(host)) {
            this.productionViolations.push(`websocket to ${host}`);
          }
        } catch {
          /* ignore */
        }
      });
    context.pages().forEach(watchSockets);
    context.on('page', watchSockets);
  }

  private isUnexpectedSupabase(host: string): boolean {
    if (!this.expectedSupabaseHost) return false;
    return /\.supabase\.(co|in)$/.test(host) && host !== this.expectedSupabaseHost;
  }

  private async handle(route: Route): Promise<void> {
    const req = route.request();
    let url: URL;
    try {
      url = new URL(req.url());
    } catch {
      return route.continue();
    }
    if (url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();

    const host = url.hostname.toLowerCase();
    if (isProductionHost(host) || this.isUnexpectedSupabase(host)) {
      this.productionViolations.push(`${req.method()} ${host}${url.pathname}`);
      return route.abort('blockedbyclient');
    }

    for (const rule of this.rules) {
      if (!rule.match(req, url)) continue;
      this.ruleHits.push({ rule: rule.name, method: req.method(), path: url.pathname, body: safeBody(req) });
      const a = rule.action;
      if (a.kind === 'abort') return route.abort('failed');
      if (a.kind === 'fulfill') {
        return route.fulfill({ status: a.status, body: a.body ?? '', contentType: a.contentType ?? 'application/json' });
      }
      let response: APIResponse;
      try {
        response = await route.fetch();
      } catch {
        return route.abort('failed');
      }
      const json = await response.json().catch(() => undefined);
      if (json === undefined) return route.fulfill({ response });
      return route.fulfill({ response, json: a.mutate(json) });
    }

    const isRest = url.pathname.includes('/rest/v1/');
    if (isRest && !READ_METHODS.has(req.method())) {
      const resource = url.pathname.split('/rest/v1/')[1] ?? '';
      const isRpc = resource.startsWith('rpc/');
      const allowed = isRpc
        ? READ_ONLY_RPC.test(resource.slice(4))
        : ALLOWED_WRITE_TABLES.has(resource.split('?')[0]);
      if (!allowed) {
        this.blockedWrites.push({ rule: 'write-guard', method: req.method(), path: url.pathname, body: undefined });
        return route.abort('failed');
      }
    }
    return route.continue();
  }

  /** No request reached a production host. Call at the end of every test (and after login). */
  assertNoProductionTraffic(): void {
    expect(this.productionViolations, 'requests to production hosts were attempted and blocked').toEqual([]);
  }
}

/** Matches a Supabase REST read on `table` whose decoded query string satisfies `query`. */
export const restRead =
  (table: string, query: (decodedSearch: string) => boolean) =>
  (req: Request, url: URL): boolean =>
    req.method() === 'GET' &&
    url.pathname.endsWith(`/rest/v1/${table}`) &&
    query(decodeURIComponent(url.search));

export const restWrite =
  (resource: string) =>
  (req: Request, url: URL): boolean =>
    !READ_METHODS.has(req.method()) && url.pathname.endsWith(`/rest/v1/${resource}`);

export async function loginAs(page: Page, env: StagingEnv, role: StagingRole): Promise<void> {
  const creds = env.credentials[role];
  if (!creds) throw new Error(`Missing E2E_STAGING_${role.toUpperCase()}_EMAIL / _PASSWORD`);
  await page.goto('/hospital/login');
  await page.locator('input[type="email"]').fill(creds.email);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.locator('button[type="submit"]').click();
  await expect(
    page,
    `${role} login did not reach the app. Staging test accounts must not require 2FA.`
  ).toHaveURL(/\/(dashboard|hospital\/(?!login)|pharmacy|consultations)/, { timeout: 45_000 });
}

/** Finds the value of the first "NEWS2"/"Score" badge matching `pattern`. */
export async function readNews2(page: Page, pattern: RegExp): Promise<{ score: number; risk: string }> {
  const badge = page.getByText(pattern).first();
  await expect(badge).toBeVisible();
  const text = (await badge.textContent()) ?? '';
  const m = text.replace(/\s+/g, ' ').match(/(\d+)\s*\(\s*([A-Z_]+)\s*\)/);
  if (!m) throw new Error(`Could not parse NEWS2 badge text: "${text}"`);
  return { score: Number(m[1]), risk: m[2].toLowerCase() };
}
