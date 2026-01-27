/**
 * E2E Test Utilities
 * 
 * Common helper functions for Playwright tests.
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for page to be fully loaded (no network activity)
 */
export async function waitForPageLoad(page: Page, timeout = 30000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for a toast/notification to appear and optionally verify its content
 */
export async function waitForToast(
  page: Page,
  expectedText?: string,
  type: 'success' | 'error' | 'info' | 'warning' = 'success'
): Promise<void> {
  const toastSelector = '[data-sonner-toast], [role="alert"], .toast';
  
  await page.waitForSelector(toastSelector, { state: 'visible', timeout: 10000 });
  
  if (expectedText) {
    const toast = page.locator(toastSelector).filter({ hasText: expectedText });
    await expect(toast).toBeVisible();
  }
}

/**
 * Fill a form field with retry logic
 */
export async function fillFormField(
  page: Page,
  selector: string,
  value: string,
  options?: { clear?: boolean }
): Promise<void> {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'visible' });
  
  if (options?.clear) {
    await element.clear();
  }
  
  await element.fill(value);
}

/**
 * Click with retry and wait for navigation if expected
 */
export async function clickAndWait(
  page: Page,
  selector: string,
  expectNavigation = false
): Promise<void> {
  const element = page.locator(selector).first();
  await element.waitFor({ state: 'visible' });
  
  if (expectNavigation) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      element.click(),
    ]);
  } else {
    await element.click();
  }
}

/**
 * Check if an element exists without throwing
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    const count = await page.locator(selector).count();
    return count > 0;
  } catch {
    return false;
  }
}

/**
 * Get all visible text from a page section
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector).first();
  return (await element.textContent()) || '';
}

/**
 * Take a screenshot with a timestamp
 */
export async function takeTimestampedScreenshot(
  page: Page,
  name: string
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `test-results/screenshots/${name}-${timestamp}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 30000
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      return typeof urlPattern === 'string' 
        ? url.includes(urlPattern)
        : urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Assert table row count
 */
export async function assertTableRowCount(
  page: Page,
  tableSelector: string,
  expectedCount: number
): Promise<void> {
  const rows = page.locator(`${tableSelector} tbody tr`);
  await expect(rows).toHaveCount(expectedCount);
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: object,
  status = 200
): Promise<void> {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Generate random test data
 */
export const testData = {
  email: () => `test-${Date.now()}@caresync-test.com`,
  phone: () => `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
  name: () => `Test User ${Date.now()}`,
  mrn: () => `MRN-${Date.now()}`,
  uuid: () => crypto.randomUUID(),
};

/**
 * Retry an operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Performance mark helpers
 */
export const performance = {
  mark: (page: Page, name: string) => 
    page.evaluate((n) => window.performance.mark(n), name),
  
  measure: (page: Page, name: string, startMark: string, endMark: string) =>
    page.evaluate(
      ({ n, s, e }) => {
        window.performance.measure(n, s, e);
        const entry = window.performance.getEntriesByName(n)[0];
        return entry?.duration || 0;
      },
      { n: name, s: startMark, e: endMark }
    ),
};
