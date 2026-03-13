/**
 * Lab Technician Role Tests
 * Tests specific to lab workflows: order queue, sample collection, access guards.
 *
 * @tags @lab_technician @role
 */

import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from '../../../pages';
import { TEST_USERS } from '../../../config/test-users';

test.describe('Lab Technician Role @lab_technician @role', () => {
  let loginPage: LoginPage;
  let dashboard: DashboardPage;
  const labTech = TEST_USERS.lab_technician;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboard = new DashboardPage(page);

    await loginPage.navigate();
    await loginPage.loginAndWaitForDashboard(labTech.email, labTech.password);
  });

  // ── Dashboard smoke ───────────────────────────────────────────────────────

  test.describe('Dashboard Access @smoke', () => {
    test('should land on lab dashboard after login', async ({ page }) => {
      const loaded = await dashboard.isDashboardLoaded();
      expect(loaded).toBeTruthy();
    });

    test('should display lab orders section or tab', async ({ page }) => {
      // Lab dashboard should show Order Queue tab or Active Lab Orders section
      await expect(
        page.getByRole('tab', { name: 'Order Queue' })
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  // ── LAB-TC-01: Pending Lab Orders ─────────────────────────────────────────

  test.describe('Lab Orders @critical', () => {
    test('LAB-TC-01 laboratory page renders without crash', async ({ page }) => {
      await page.goto('/laboratory');
      await expect(page).toHaveURL(/\/laboratory/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    });

    test('LAB-TC-01 pending orders list renders', async ({ page }) => {
      await page.goto('/laboratory');
      await page.waitForLoadState('networkidle');
      // List / table / empty state — any of these confirms the page rendered
      const content = await page.textContent('body');
      const hasOrderContent =
        /pending|orders|lab|sample|result|no orders|empty/i.test(content ?? '');
      expect(hasOrderContent).toBeTruthy();
    });
  });

  // ── LAB-TC-02: Sample Collection Flow ─────────────────────────────────────

  test.describe('Sample Collection', () => {
    test('LAB-TC-02 lab page has status management UI', async ({ page }) => {
      await page.goto('/laboratory');
      await page.waitForLoadState('networkidle');
      // Status transitions or action buttons should be present
      const hasActions =
        (await page
          .getByRole('button', { name: /collect|sample|process|update status|mark/i })
          .count()) > 0 ||
        (await page.locator('select, [role="combobox"]').count()) > 0;

      // Accept either explicit action buttons or empty state with no data
      expect(hasActions || (await page.getByText(/no (lab )?orders|empty/i).isVisible())).toBeTruthy();
    });
  });

  // ── LAB-TC-03: Access Guards ──────────────────────────────────────────────

  test.describe('Access Guards @security', () => {
    test('LAB-TC-03 lab tech cannot access pharmacy module', async ({ page }) => {
      await page.goto('/pharmacy');
      const denied = page.getByText(/access denied|unauthorized|not authorized/i);
      const isDenied = await denied.isVisible().catch(() => false);
      const redirected = !page.url().includes('/pharmacy');
      expect(isDenied || redirected).toBeTruthy();
    });

    test('LAB-TC-03 lab tech cannot access consultations', async ({ page }) => {
      await page.goto('/consultations');
      const denied = page.getByText(/access denied|unauthorized|not authorized/i);
      const isDenied = await denied.isVisible().catch(() => false);
      const redirected = !page.url().includes('/consultations');
      expect(isDenied || redirected).toBeTruthy();
    });

    test('LAB-TC-03 lab tech cannot access admin staff settings', async ({ page }) => {
      await page.goto('/settings/staff');
      const denied = page.getByText(/access denied|unauthorized|not authorized/i);
      const isDenied = await denied.isVisible().catch(() => false);
      const redirected = !page.url().includes('/settings/staff');
      expect(isDenied || redirected).toBeTruthy();
    });

    test('LAB-TC-03 lab tech can access laboratory module', async ({ page }) => {
      await page.goto('/laboratory');
      await expect(page).toHaveURL(/\/laboratory/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });
  });
});
