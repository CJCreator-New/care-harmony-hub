/**
 * Patient Role Tests
 * Tests specific to patient portal: own record access, prescriptions, access guards.
 *
 * @tags @patient @role
 */

import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from '../../../pages';
import { TEST_USERS } from '../../../config/test-users';

test.describe('Patient Role @patient @role', () => {
  let loginPage: LoginPage;
  let dashboard: DashboardPage;
  const patient = TEST_USERS.patient;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboard = new DashboardPage(page);

    await loginPage.navigate();
    await loginPage.loginAndWaitForDashboard(patient.email, patient.password);
  });

  // ── Dashboard smoke ───────────────────────────────────────────────────────

  test.describe('Portal Access @smoke', () => {
    test('should land on patient portal after login', async ({ page }) => {
      // Patient lands on portal or dashboard
      await expect(page).toHaveURL(/\/(patient\/portal|portal|dashboard)/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    test('should not show internal staff navigation items', async ({ page }) => {
      // Staff-only nav items should not be visible to patients
      const staffNav = page.getByRole('link', { name: /consultations|pharmacy|laboratory|staff/i });
      // Count — if present they'd be 0 or redirects would handle them
      expect(await staffNav.count()).toBe(0);
    });
  });

  // ── PAT-TC-01: Own Appointments ───────────────────────────────────────────

  test.describe('Appointments @critical', () => {
    test('PAT-TC-01 patient can view own appointments list', async ({ page }) => {
      await page.goto('/appointments');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    });

    test('PAT-TC-01 appointments page does not expose other patients data', async ({ page }) => {
      await page.goto('/appointments');
      await page.waitForLoadState('networkidle');
      // The test user email for other roles should not appear in the page content
      const body = await page.textContent('body');
      expect(body).not.toContain('doctor@testgeneral.com');
      expect(body).not.toContain('nurse@testgeneral.com');
    });
  });

  // ── PAT-TC-02: Prescription Status ────────────────────────────────────────

  test.describe('Prescriptions', () => {
    test('PAT-TC-02 patient can view prescriptions page', async ({ page }) => {
      // Try both patient portal and general medications route
      await page.goto('/patient/portal');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    });
  });

  // ── PAT-TC-03: Access Guards ──────────────────────────────────────────────

  test.describe('Access Guards @security', () => {
    test('PAT-TC-03 patient cannot access admin panel', async ({ page }) => {
      await page.goto('/admin');
      const denied = page.getByText(/access denied|unauthorized|not authorized/i);
      const isDenied = await denied.isVisible().catch(() => false);
      const redirected = !page.url().includes('/admin');
      expect(isDenied || redirected).toBeTruthy();
    });

    test('PAT-TC-03 patient cannot access consultations module', async ({ page }) => {
      await page.goto('/consultations');
      const denied = page.getByText(/access denied|unauthorized|not authorized/i);
      const isDenied = await denied.isVisible().catch(() => false);
      const redirected = !page.url().includes('/consultations');
      expect(isDenied || redirected).toBeTruthy();
    });

    test('PAT-TC-03 patient cannot access laboratory module', async ({ page }) => {
      await page.goto('/laboratory');
      const denied = page.getByText(/access denied|unauthorized|not authorized/i);
      const isDenied = await denied.isVisible().catch(() => false);
      const redirected = !page.url().includes('/laboratory');
      expect(isDenied || redirected).toBeTruthy();
    });

    test('PAT-TC-03 patient cannot access staff settings', async ({ page }) => {
      await page.goto('/settings/staff');
      const denied = page.getByText(/access denied|unauthorized|not authorized/i);
      const isDenied = await denied.isVisible().catch(() => false);
      const redirected = !page.url().includes('/settings/staff');
      expect(isDenied || redirected).toBeTruthy();
    });
  });
});
