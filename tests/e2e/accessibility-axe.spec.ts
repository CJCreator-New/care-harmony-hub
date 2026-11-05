/**
 * S3-02 / TEST-07 / A11Y-16: real accessibility checks over real routes.
 *
 * Replaces the fixture-based suites in tests/accessibility (which test inline JSX, not the app)
 * for the routes that matter most. Each route is scanned with axe-core in a browser and must have
 * no critical or serious violations. A keyboard journey checks the skip link and focus order.
 *
 * Requires: the app running at E2E_BASE_URL (default http://localhost:8080) and the
 * @axe-core/playwright package. If the package is missing, the suite skips with a message.
 *
 * Protected routes are scanned only when E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD are set,
 * so the public routes always run without credentials.
 */
import { test, expect, type Page } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Minimal shape of @axe-core/playwright's AxeBuilder that this suite uses.
type AxeBuilderCtor = new (options: { page: Page }) => {
  withTags(tags: string[]): { analyze(): Promise<{ violations: AxeViolation[] }> };
};
type AxeViolation = { id: string; impact?: string | null; help: string; nodes: unknown[] };

function loadAxeBuilder(): AxeBuilderCtor | null {
  try {
    const mod = require('@axe-core/playwright');
    return (mod.default ?? mod.AxeBuilder ?? mod) as AxeBuilderCtor;
  } catch {
    return null;
  }
}

const AxeBuilder = loadAxeBuilder();
const AXE_MISSING_MESSAGE =
  'Skipped: @axe-core/playwright is not installed. Run npm install to restore it, then re-run this suite.';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const BLOCKING_IMPACTS = new Set(['critical', 'serious']);

const PUBLIC_ROUTES = ['/hospital', '/hospital/login', '/hospital/signup', '/hospital/forgot-password'];
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];

async function scanForBlockingViolations(page: Page): Promise<AxeViolation[]> {
  if (!AxeBuilder) throw new Error(AXE_MISSING_MESSAGE);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations.filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ''));
}

function describeViolations(violations: AxeViolation[]) {
  return violations.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length} node(s))`).join('\n');
}

test.describe('Accessibility: axe over public routes (S3-02)', () => {
  test.skip(!AxeBuilder, AXE_MISSING_MESSAGE);

  for (const route of PUBLIC_ROUTES) {
    for (const viewport of VIEWPORTS) {
      test(`${route} has no critical or serious violations at ${viewport.name} width`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(route);
        await page.waitForLoadState('networkidle');

        const blocking = await scanForBlockingViolations(page);
        expect(blocking, describeViolations(blocking)).toEqual([]);
      });
    }
  }
});

test.describe('Accessibility: keyboard journey on the login page (S3-02)', () => {
  test.skip(!AxeBuilder, AXE_MISSING_MESSAGE);

  test('the first Tab stop is the skip link, and it moves focus to the page main region', async ({ page }) => {
    await page.goto('/hospital/login');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();

    await page.keyboard.press('Enter');
    const target = page.locator('#main-content');
    await expect(target).toHaveCount(1);
    await expect(target).toBeFocused();
  });
});

test.describe('Accessibility: off-canvas navigation on a narrow screen (A11Y-04)', () => {
  test.skip(!AxeBuilder, AXE_MISSING_MESSAGE);

  const email = process.env.E2E_LOGIN_EMAIL;
  const password = process.env.E2E_LOGIN_PASSWORD;
  test.skip(!email || !password, 'Skipped: set E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD to scan protected routes.');

  test('the closed drawer is out of the tab order, and Escape returns focus to the menu trigger', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/hospital/login');
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/dashboard/);

    const sidebar = page.locator('aside[aria-label="Application sidebar"]');
    await expect(sidebar).toHaveAttribute('inert', '');

    const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
    await menuButton.click();
    await expect(sidebar).not.toHaveAttribute('inert', '');
    await expect(page.getByRole('button', { name: 'Close navigation menu' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(sidebar).toHaveAttribute('inert', '');
    await expect(menuButton).toBeFocused();

    const blocking = await scanForBlockingViolations(page);
    expect(blocking, describeViolations(blocking)).toEqual([]);
  });
});
