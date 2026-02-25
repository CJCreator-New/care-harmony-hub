/**
 * Data Verification Helper
 *
 * Provides utilities for verifying database state during E2E tests by
 * intercepting Supabase REST/RPC responses and parsing their payloads.
 *
 * Usage example:
 *   const v = new DataVerifier(page);
 *   await v.waitForRecord('patient_queue', { patient_id: 'xxx', status: 'waiting' });
 */

import { Page, Response, expect } from '@playwright/test';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecordMatcher {
  [column: string]: string | number | boolean | null | undefined;
}

export interface InterceptedRecord {
  table: string;
  payload: Record<string, unknown>[];
  status: number;
  timestamp: number;
}

export interface VerificationResult {
  found: boolean;
  record: Record<string, unknown> | null;
  allRecords: Record<string, unknown>[];
}

// ─── DataVerifier class ───────────────────────────────────────────────────────

export class DataVerifier {
  private page: Page;

  /** Captured Supabase responses keyed by table name */
  private captured: Map<string, InterceptedRecord[]> = new Map();

  constructor(page: Page) {
    this.page = page;
    this.attachInterceptors();
  }

  // ── Intercept Supabase REST calls ──────────────────────────────────────────

  private attachInterceptors() {
    this.page.on('response', async (response: Response) => {
      const url = response.url();

      // Match Supabase REST endpoint patterns: /rest/v1/<table>
      const restMatch = url.match(/\/rest\/v1\/([a-z_]+)/);
      if (!restMatch) return;

      const table = restMatch[1];
      if (!['patient_queue', 'consultations', 'prescriptions', 'lab_orders',
            'appointments', 'inventory', 'activity_logs', 'user_roles'].includes(table)) {
        return;
      }

      try {
        const text = await response.text().catch(() => '[]');
        const payload: Record<string, unknown>[] = text.startsWith('[')
          ? JSON.parse(text)
          : text.startsWith('{')
          ? [JSON.parse(text)]
          : [];

        const existing = this.captured.get(table) ?? [];
        existing.push({
          table,
          payload,
          status: response.status(),
          timestamp: Date.now(),
        });
        this.captured.set(table, existing);
      } catch {
        // Non-JSON body — ignore
      }
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Clear all captured responses. Call between test steps to avoid stale data.
   */
  clear() {
    this.captured.clear();
  }

  /**
   * Return all captured records for a given table.
   */
  getRecords(table: string): Record<string, unknown>[] {
    return (this.captured.get(table) ?? []).flatMap(r => r.payload);
  }

  /**
   * Find the first record matching the provided column-value pairs.
   */
  findRecord(table: string, matcher: RecordMatcher): VerificationResult {
    const all = this.getRecords(table);
    const found = all.find(record =>
      Object.entries(matcher).every(([k, v]) => record[k] === v)
    ) ?? null;
    return { found: found !== null, record: found, allRecords: all };
  }

  /**
   * Poll until a matching record appears in captured responses or timeout.
   * Triggers a page network action to fetch the relevant table if needed.
   */
  async waitForRecord(
    table: string,
    matcher: RecordMatcher,
    options: { timeout?: number; triggerRoute?: string } = {}
  ): Promise<Record<string, unknown>> {
    const { timeout = 15_000, triggerRoute } = options;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const result = this.findRecord(table, matcher);
      if (result.found && result.record) return result.record;

      // If caller provided a route, navigate there to trigger a fresh fetch
      if (triggerRoute) {
        await this.page.goto(triggerRoute);
        await this.page.waitForLoadState('networkidle');
      } else {
        await this.page.waitForTimeout(500);
      }
    }

    // Final attempt
    const result = this.findRecord(table, matcher);
    if (result.found && result.record) return result.record;

    throw new Error(
      `[DataVerifier] Timed out waiting for ${JSON.stringify(matcher)} in "${table}". ` +
      `Captured ${this.getRecords(table).length} records.`
    );
  }

  /**
   * Assert that a record matching the criteria exists.
   * Wraps Playwright's expect for better error messages.
   */
  async assertRecord(table: string, matcher: RecordMatcher, message?: string) {
    const result = this.findRecord(table, matcher);
    expect(
      result.found,
      message ?? `Expected a record matching ${JSON.stringify(matcher)} in "${table}"`
    ).toBe(true);
    return result.record!;
  }

  /**
   * Assert that NO record matching the criteria exists.
   */
  assertNoRecord(table: string, matcher: RecordMatcher, message?: string) {
    const result = this.findRecord(table, matcher);
    expect(
      result.found,
      message ?? `Expected NO record matching ${JSON.stringify(matcher)} in "${table}"`
    ).toBe(false);
  }

  /**
   * Assert that a specific column value exists anywhere in captured records.
   */
  assertColumnValue(table: string, column: string, value: unknown, message?: string) {
    const records = this.getRecords(table);
    const found = records.some(r => r[column] === value);
    expect(
      found,
      message ?? `Expected ${column}=${value} in "${table}"`
    ).toBe(true);
  }
}

// ─── Network response helpers ─────────────────────────────────────────────────

/**
 * Intercept the next Supabase response for a table and return its parsed body.
 */
export async function captureNextTableResponse(
  page: Page,
  table: string,
  triggerFn: () => Promise<void>
): Promise<Record<string, unknown>[]> {
  const [response] = await Promise.all([
    page.waitForResponse(
      resp => resp.url().includes(`/rest/v1/${table}`) && resp.status() < 400,
      { timeout: 15_000 }
    ),
    triggerFn(),
  ]);

  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [data];
  } catch {
    return [];
  }
}

/**
 * Intercept the next API response matching a URL pattern.
 */
export async function captureApiResponse<T = unknown>(
  page: Page,
  urlPattern: string | RegExp,
  triggerFn: () => Promise<void>
): Promise<T> {
  const [response] = await Promise.all([
    page.waitForResponse(
      resp => {
        const url = resp.url();
        return typeof urlPattern === 'string'
          ? url.includes(urlPattern)
          : urlPattern.test(url);
      },
      { timeout: 15_000 }
    ),
    triggerFn(),
  ]);

  return response.json() as Promise<T>;
}

// ─── Convenience assertions ───────────────────────────────────────────────────

/**
 * Navigate to a page and assert that an element with text is visible.
 */
export async function assertPageContains(page: Page, route: string, text: string | RegExp) {
  await page.goto(route);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(text).first()).toBeVisible();
}

/**
 * Assert that the current URL matches the expected pattern.
 */
export async function assertOnRoute(page: Page, pattern: string | RegExp) {
  await expect(page).toHaveURL(pattern);
}

/**
 * Assert an error toast or access-denied message is visible.
 */
export async function assertAccessDenied(page: Page) {
  const denied = page.locator(
    '[data-sonner-toast][data-type="error"], [role="alert"], .text-destructive, [data-testid="access-denied"]'
  ).first();
  const currentUrl = page.url();
  const onDashboard = /dashboard/.test(currentUrl);
  const toastVisible = await denied.isVisible().catch(() => false);

  expect(
    onDashboard || toastVisible,
    `Expected access denied message or redirect to /dashboard. Current URL: ${currentUrl}`
  ).toBe(true);
}
