/**
 * Pharmacist Role Tests
 * Tests specific to pharmacy workflows: prescription queue, inventory, access guards.
 *
 * @tags @pharmacist @role
 */

import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from '../../../pages';
import { TEST_USERS } from '../../../config/test-users';

test.describe('Pharmacist Role @pharmacist @role', () => {
  let loginPage: LoginPage;
  let dashboard: DashboardPage;
  const pharmacist = TEST_USERS.pharmacist;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboard = new DashboardPage(page);

    await loginPage.navigate();
    await loginPage.loginAndWaitForDashboard(pharmacist.email, pharmacist.password);
  });

  // ── Dashboard smoke ───────────────────────────────────────────────────────

  test.describe('Dashboard Access @smoke', () => {
    test('should land on pharmacist dashboard after login', async ({ page }) => {
      const loaded = await dashboard.isDashboardLoaded();
      expect(loaded).toBeTruthy();
    });

    test('should display Prescription Queue section', async ({ page }) => {
      // Prescription queue is displayed as a card section, not a tab
      await expect(
        page.getByText(/prescription queue/i)
      ).toBeVisible({ timeout: 10_000 });
    });

    test('should display at least 4 metric cards', async ({ page }) => {
      const cards = page.locator('[class*="card"]');
      const count = await cards.count();
      expect(count).toBeGreaterThanOrEqual(4);
    });
  });

  // ── PHA-TC-01: Prescription Queue ─────────────────────────────────────────

  test.describe('Prescription Queue @critical', () => {
    test('PHA-TC-01 prescription queue section renders list', async ({ page }) => {
      // Prescription queue is displayed as a card section on the dashboard, not a tab
      await expect(page.getByText(/prescription queue/i)).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    });

    test('PHA-TC-01 prescription list has expected columns', async ({ page }) => {
      await page.goto('/pharmacy');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      // Patient, Medication and Status columns or labels should be present
      const pageText = await page.textContent('body');
      const hasExpectedContent =
        /patient|medication|prescription|status/i.test(pageText ?? '');
      expect(hasExpectedContent).toBeTruthy();
    });
  });

  // ── PHA-TC-02: Inventory & Stock ──────────────────────────────────────────

  test.describe('Inventory Management', () => {
    test('PHA-TC-02 Inventory & Stock tab renders without crash', async ({ page }) => {
      await page
        .getByRole('tab', { name: /inventory|stock/i })
        .click();

      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    });

    test('PHA-TC-02 inventory alert count is displayed', async ({ page }) => {
      // The "Inventory Alerts" metric card should always be rendered (count may be 0)
      await expect(
        page.getByText(/inventory alerts/i)
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  // ── PHA-TC-03: Access Guards ──────────────────────────────────────────────

  test.describe('Access Guards @security', () => {
    test('PHA-TC-03 pharmacist cannot create new patients', async ({ page }) => {
      await page.goto('/patients/new');
      const denied = page.getByText(/access denied|unauthorized|not authorized/i);
      const isDenied = await denied.isVisible().catch(() => false);
      const redirected = !page.url().includes('/patients/new');
      expect(isDenied || redirected).toBeTruthy();
    });

    test('PHA-TC-03 pharmacist cannot access consultations', async ({ page }) => {
      await page.goto('/consultations');
      const denied = page.getByText(/access denied|unauthorized|not authorized/i);
      const isDenied = await denied.isVisible().catch(() => false);
      const redirected = !page.url().includes('/consultations');
      expect(isDenied || redirected).toBeTruthy();
    });

    test('PHA-TC-03 pharmacist can access inventory', async ({ page }) => {
      await page.goto('/inventory');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });
  });
});
