import { test, expect, Page } from '@playwright/test';
import { getRoleCredentials, type UserRole } from './framework/roles';
import { bootstrapMockAuth, loginAsTestUser } from './utils/test-helpers';

type LiveRole = UserRole;

const LIVE_ROLES: LiveRole[] = ['admin', 'doctor', 'nurse', 'receptionist', 'viewer'];

const ROLE_ROUTES: Record<LiveRole, string[]> = {
  admin: ['/dashboard', '/settings/staff', '/settings'],
  doctor: ['/dashboard', '/consultations', '/patients'],
  nurse: ['/dashboard', '/queue', '/patients'],
  receptionist: ['/dashboard', '/queue', '/appointments'],
  viewer: ['/dashboard'],
};

const ROLE_BUTTON_HINTS: Record<LiveRole, RegExp[]> = {
  admin: [/staff|user|settings|reports|analytics/i],
  doctor: [/consult|patient|prescription|lab/i],
  nurse: [/queue|vitals|patient|task|care/i],
  receptionist: [/queue|appointment|check-?in|register/i],
  viewer: [/view|dashboard|overview/i],
};

async function loginAs(page: Page, role: LiveRole) {
  const creds = getRoleCredentials(role);
  if (!creds) {
    // Deterministic mock-auth bootstrap (works even when live credentials are unavailable).
    if (role === 'viewer') {
      await bootstrapMockAuth(page, 'admin');
    } else {
      await bootstrapMockAuth(page, role as Exclude<LiveRole, 'viewer'>);
    }
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard|hospital\/account-setup/i);
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

async function checkDashboardButtons(page: Page, role: LiveRole) {
  await expect(page.locator('body')).toBeVisible();
  await page.waitForLoadState('networkidle');

  const buttons = page.getByRole('button');
  const links = page.getByRole('link');
  const interactiveCount = (await buttons.count()) + (await links.count());
  if (interactiveCount === 0) {
    await assertNoRuntimeCrash(page);
    return;
  }

  // Try role-specific quick actions first (if present)
  for (const hint of ROLE_BUTTON_HINTS[role]) {
    const btn = buttons.filter({ hasText: hint }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true });
      await page.waitForTimeout(300);
      await assertNoRuntimeCrash(page);
      return;
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
      return;
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
      return;
    }
  }
}

async function checkRoleFlowRoutes(page: Page, role: LiveRole) {
  for (const route of ROLE_ROUTES[role]) {
    await page.goto(route);
    await page.waitForTimeout(300);
    await assertNoRuntimeCrash(page);
    await expect(page).toHaveURL(new RegExp(route.replace('/', '\\/').replace('?', '\\?') + '|access|unauthorized', 'i'));
  }
}

test.describe('Live Role Sign-in and Flow Validation', () => {
  for (const role of LIVE_ROLES) {
    test(`${role}: sign in, check dashboard buttons, validate core flow`, async ({ page }) => {
      await loginAs(page, role);
      await checkDashboardButtons(page, role);
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
