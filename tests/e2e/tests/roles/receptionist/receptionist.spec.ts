/**
 * Receptionist Role Tests
 * Tests specific to reception workflows: check-in, scheduling, access guards.
 *
 * @tags @receptionist @role
 */

import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from '../../../pages';
import { TEST_USERS } from '../../../config/test-users';

test.describe('Receptionist Role @receptionist @role', () => {
  let loginPage: LoginPage;
  let dashboard: DashboardPage;
  const receptionist = TEST_USERS.receptionist;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboard = new DashboardPage(page);

    await loginPage.navigate();
    await loginPage.loginAndWaitForDashboard(receptionist.email, receptionist.password);
  });

  // ── Dashboard smoke ───────────────────────────────────────────────────────

  test.describe('Dashboard Access @smoke', () => {
    test('should land on reception dashboard after login', async ({ page }) => {
      const loaded = await dashboard.isDashboardLoaded();
      expect(loaded).toBeTruthy();
    });

    test('should display stat cards on dashboard', async ({ page }) => {
      // Receptionist dashboard has stats cards in the overview tab - check for one specific stat
      await expect(page.getByText("Today's Appointments")).toBeVisible();
    });
  });

  // ── REC-TC-01: Walk-in Check-In ───────────────────────────────────────────

  test.describe('Queue & Check-In @critical', () => {
    test('REC-TC-01 should access queue management page', async ({ page }) => {
      await page.goto('/queue');
      await expect(page).toHaveURL(/\/queue/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    test('REC-TC-01 queue page has check-in or new appointment option', async ({ page }) => {
      await page.goto('/queue');
      const cta = page
        .getByRole('button', { name: /check.?in|add patient|new appointment|register/i })
        .first();
      await expect(cta).toBeVisible({ timeout: 10_000 });
    });
  });

  // ── REC-TC-02: Appointment Scheduling ─────────────────────────────────────

  test.describe('Appointment Scheduling', () => {
    test('REC-TC-02 should access appointments page', async ({ page }) => {
      await page.goto('/appointments');
      await expect(page).toHaveURL(/\/appointments/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    test('REC-TC-02 appointments page has new appointment button', async ({ page }) => {
      await page.goto('/appointments');
      const newBtn = page
        .getByRole('button', { name: /new appointment|schedule|book/i })
        .first();
      await expect(newBtn).toBeVisible({ timeout: 10_000 });
    });

    test('REC-TC-02 appointments list renders a table or card grid', async ({ page }) => {
      await page.goto('/appointments');
      await page.waitForLoadState('networkidle');
      const list = page.locator('table, [data-testid="appointments-list"], [class*="grid"]').first();
      await expect(list).toBeVisible({ timeout: 10_000 });
    });
  });

  // ── REC-TC-03: Access Guards ──────────────────────────────────────────────

  test.describe('Access Guards @security', () => {
    test('REC-TC-03 receptionist cannot access pharmacy module', async ({ page }) => {
      await page.goto('/pharmacy');
      const denied = page.getByText(/access denied|unauthorized|not authorized/i);
      const isDenied = await denied.isVisible().catch(() => false);
      const redirected = !page.url().includes('/pharmacy');
      expect(isDenied || redirected).toBeTruthy();
    });

    test('REC-TC-03 receptionist cannot access laboratory module', async ({ page }) => {
      await page.goto('/laboratory');
      const denied = page.getByText(/access denied|unauthorized|not authorized/i);
      const isDenied = await denied.isVisible().catch(() => false);
      const redirected = !page.url().includes('/laboratory');
      expect(isDenied || redirected).toBeTruthy();
    });

    test('REC-TC-03 receptionist cannot access consultations', async ({ page }) => {
      await page.goto('/consultations');
      const denied = page.getByText(/access denied|unauthorized|not authorized/i);
      const isDenied = await denied.isVisible().catch(() => false);
      const redirected = !page.url().includes('/consultations');
      expect(isDenied || redirected).toBeTruthy();
    });

    test('REC-TC-03 receptionist can access billing', async ({ page }) => {
      await page.goto('/billing');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });
  });
});
