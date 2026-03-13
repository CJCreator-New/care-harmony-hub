/**
 * Nurse Role Tests
 * Tests specific to nurse workflows: queue, vitals, prep, handover, access guards.
 *
 * @tags @nurse @role
 */

import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from '../../../pages';
import { TEST_USERS } from '../../../config/test-users';

test.describe('Nurse Role @nurse @role', () => {
  let loginPage: LoginPage;
  let dashboard: DashboardPage;
  const nurse = TEST_USERS.nurse;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboard = new DashboardPage(page);

    await loginPage.navigate();
    await loginPage.loginAndWaitForDashboard(nurse.email, nurse.password);
  });

  // ── Dashboard smoke ───────────────────────────────────────────────────────

  test.describe('Dashboard Access @smoke', () => {
    test('should land on nurse dashboard after login', async ({ page }) => {
      const loaded = await dashboard.isDashboardLoaded();
      expect(loaded).toBeTruthy();
    });

    test('should display Patient Queue section', async ({ page }) => {
      // Patient queue is displayed in the Overview tab (default), not as a separate tab
      await expect(
        page.getByRole('heading', { name: 'Patient Queue' })
      ).toBeVisible();
    });

    test('should display Prep Station tab', async ({ page }) => {
      await expect(
        page.getByRole('tab', { name: /prep station/i })
      ).toBeVisible();
    });

    test('should NOT show Doctor Availability widget', async ({ page }) => {
      // Removed in NurseDashboard refactor — doctor availability is doctor-domain
      await expect(
        page.getByText(/doctor availability/i)
      ).toHaveCount(0);
    });
  });

  // ── NUR-TC-01: Record Vitals ──────────────────────────────────────────────

  test.describe('Record Vitals @critical', () => {
    test('NUR-TC-01 should open Record Vitals modal', async ({ page }) => {
      await page
        .getByRole('button', { name: /record vitals/i })
        .click();

      await expect(
        page.getByRole('dialog')
      ).toBeVisible();
    });

    test('NUR-TC-01 vitals modal has required fields', async ({ page }) => {
      await page.getByRole('button', { name: /record vitals/i }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Key vital fields should be present
      await expect(
        dialog.getByRole('textbox').or(dialog.locator('input')).first()
      ).toBeVisible();
    });
  });

  // ── NUR-TC-02: Patient Prep Checklist ─────────────────────────────────────

  test.describe('Patient Prep Station', () => {
    test('NUR-TC-02 Prep Station tab should render without crash', async ({ page }) => {
      await page.getByRole('tab', { name: /prep station/i }).click();

      await expect(page.getByRole('main')).toBeVisible();
      // Should not throw or show an error boundary
      await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    });
  });

  // ── NUR-TC-03: Shift Handover ─────────────────────────────────────────────

  test.describe('Shift Handover', () => {
    test('NUR-TC-03 should open Create Handover modal', async ({ page }) => {
      await page
        .getByRole('button', { name: /create handover/i })
        .click();

      await expect(page.getByRole('dialog')).toBeVisible();
    });
  });

  // ── NUR-TC-04: Access Guards ──────────────────────────────────────────────

  test.describe('Access Guards @security', () => {
    test('NUR-TC-04 nurse cannot access pharmacy module directly', async ({ page }) => {
      await page.goto('/pharmacy');

      // Should redirect away from /pharmacy or show access-denied UI
      const denied = page.getByText(/access denied|unauthorized|not authorized/i);
      const redirected = !page.url().includes('/pharmacy');
      const isDenied = await denied.isVisible().catch(() => false);

      expect(isDenied || redirected).toBeTruthy();
    });

    test('NUR-TC-04 nurse can access consultation list (read-only)', async ({ page }) => {
      await page.goto('/consultations');
      // Nurses have read access per RoleProtectedRoute; page should load
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    test('NUR-TC-04 nurse cannot access admin staff settings', async ({ page }) => {
      await page.goto('/settings/staff');

      const denied = page.getByText(/access denied|unauthorized|not authorized/i);
      const isDenied = await denied.isVisible().catch(() => false);
      const redirected = !page.url().includes('/settings/staff');

      expect(isDenied || redirected).toBeTruthy();
    });
  });
});
