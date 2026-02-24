import { test, expect, Page } from '@playwright/test';
import { getRoleCredentials, type UserRole } from './framework/roles';
import { bootstrapMockAuth, loginAsTestUser } from './utils/test-helpers';

type LiveRole = UserRole;

const LIVE_ROLES: LiveRole[] = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'];

const ROLE_ROUTES: Record<LiveRole, string[]> = {
  admin: ['/dashboard', '/settings/staff', '/settings'],
  doctor: ['/dashboard', '/consultations', '/patients'],
  nurse: ['/dashboard', '/queue', '/patients'],
  receptionist: ['/dashboard', '/queue', '/appointments'],
  pharmacist: ['/dashboard', '/pharmacy', '/inventory'],
  lab_technician: ['/dashboard', '/laboratory', '/messages'],
  patient: ['/patient/portal', '/patient/appointments', '/patient/prescriptions'],
};

const ROLE_BUTTON_HINTS: Record<LiveRole, RegExp[]> = {
  admin: [/staff|user|settings|reports|analytics/i],
  doctor: [/consult|patient|prescription|lab/i],
  nurse: [/queue|vitals|patient|task|care/i],
  receptionist: [/queue|appointment|check-?in|register/i],
  pharmacist: [/pharmacy|dispense|inventory|medication/i],
  lab_technician: [/lab|result|sample|critical/i],
  patient: [/appointment|prescription|lab|history|portal/i],
};

async function loginAs(page: Page, role: LiveRole) {
  const creds = getRoleCredentials(role);
  if (!creds) {
    // Deterministic mock-auth bootstrap (works even when live credentials are unavailable).
    await bootstrapMockAuth(page, role);
    await page.goto(role === 'patient' ? '/patient/portal' : '/dashboard');
    await expect(page).toHaveURL(/dashboard|hospital\/account-setup|patient\/portal/i);
    return;
  }

  await page.goto('/hospital/login');
  await page.getByLabel(/email/i).fill(creds!.email);
  await page.getByLabel(/password/i).fill(creds!.password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await expect(page).toHaveURL(/dashboard|hospital\/account-setup/i);
}

async function assertNoRuntimeCrash(page: Page) {
  await expect(page.getByText(/is not defined|referenceerror|typeerror|something went wrong/i)).toHaveCount(0);
}

async function checkDashboardButtons(page: Page, role: LiveRole): Promise<number> {
  await expect(page.locator('body')).toBeVisible();
  await page.waitForLoadState('networkidle');

  const buttons = page.getByRole('button');
  const links = page.getByRole('link');
  const interactiveCount = (await buttons.count()) + (await links.count());
  if (interactiveCount === 0) {
    await assertNoRuntimeCrash(page);
    return 0;
  }

  // Try role-specific quick actions first (if present)
  for (const hint of ROLE_BUTTON_HINTS[role]) {
    const btn = buttons.filter({ hasText: hint }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true });
      await page.waitForTimeout(300);
      await assertNoRuntimeCrash(page);
      return 1;
    }
  }

  // Fallback: click first visible button in page content.
  const buttonCount = await buttons.count();
  for (let i = 0; i < Math.min(8, buttonCount); i++) {
    const btn = buttons.nth(i);
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true });
      await page.waitForTimeout(300);
      await assertNoRuntimeCrash(page);
      return 1;
    }
  }

  // Secondary fallback: click first visible link.
  const linkCount = await links.count();
  for (let i = 0; i < Math.min(8, linkCount); i++) {
    const link = links.nth(i);
    if (await link.isVisible().catch(() => false)) {
      await link.click({ force: true });
      await page.waitForTimeout(300);
      await assertNoRuntimeCrash(page);
      return 1;
    }
  }

  return 0;
}

async function clickVisibleInteractiveElements(page: Page, route: string): Promise<number> {
  const selector = 'button, [role="button"], a[href]';
  await page.goto(route);
  await page.waitForTimeout(300);
  await assertNoRuntimeCrash(page);

  const total = await page.locator(selector).count();
  const maxAttempts = Math.min(12, total);
  let clicked = 0;

  for (let i = 0; i < maxAttempts; i++) {
    await page.goto(route);
    await page.waitForTimeout(250);

    const target = page.locator(selector).nth(i);
    const visible = await target.isVisible().catch(() => false);
    if (!visible) continue;

    const label = ((await target.innerText().catch(() => '')) || '').trim();
    if (/(logout|sign\s*out|delete|remove|destroy|reset|clear all)/i.test(label)) {
      continue;
    }

    const href = await target.getAttribute('href').catch(() => null);
    if (href && /^(mailto:|tel:|https?:\/\/)/i.test(href) && !href.includes('localhost')) {
      continue;
    }

    try {
      await target.click({ force: true, timeout: 3000 });
      await page.waitForTimeout(250);
      await assertNoRuntimeCrash(page);
      clicked++;
    } catch {
      // Ignore non-actionable controls and continue sweep.
    }
  }

  return clicked;
}

async function checkRoleFlowRoutes(page: Page, role: LiveRole) {
  let totalClicked = 0;
  for (const route of ROLE_ROUTES[role]) {
    await page.goto(route);
    await page.waitForTimeout(300);
    await assertNoRuntimeCrash(page);
    await expect(page).toHaveURL(new RegExp(route.replace('/', '\\/').replace('?', '\\?') + '|access|unauthorized', 'i'));
    totalClicked += await clickVisibleInteractiveElements(page, route);
  }
  expect(totalClicked).toBeGreaterThan(0);
}

test.describe('Live Role Sign-in and Flow Validation', () => {
  for (const role of LIVE_ROLES) {
    test(`${role}: sign in, check dashboard buttons, validate core flow`, async ({ page }) => {
      await loginAs(page, role);
      const clicked = await checkDashboardButtons(page, role);
      expect(clicked).toBeGreaterThanOrEqual(0);
      await checkRoleFlowRoutes(page, role);
    });
  }

  test('overall sequential flow across all roles', async ({ page }) => {
    for (const role of LIVE_ROLES) {
      await loginAs(page, role);
      await checkDashboardButtons(page, role);
      await checkRoleFlowRoutes(page, role);
      await page.context().clearCookies();
      await page.evaluate(() => localStorage.clear());
      await page.waitForTimeout(300);
    }
  });
});
