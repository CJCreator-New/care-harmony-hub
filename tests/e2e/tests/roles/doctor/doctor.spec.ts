/**
 * Doctor Role Tests
 * Tests specific to doctor workflows and permissions
 * 
 * @tags @doctor @role
 */

import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from '../../../pages';
import { TEST_USERS } from '../../../config/test-users';

test.describe('Doctor Role @doctor @role', () => {
  let loginPage: LoginPage;
  let dashboard: DashboardPage;
  const doctor = TEST_USERS.doctor;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboard = new DashboardPage(page);
    
    await loginPage.navigate();
    await loginPage.loginAndWaitForDashboard(doctor.email, doctor.password);
  });

  test.describe('Dashboard Access @smoke', () => {
    test('should access doctor dashboard', async ({ page }) => {
      const loaded = await dashboard.isDashboardLoaded();
      expect(loaded).toBeTruthy();
    });

    test('should display doctor-specific stats', async ({ page }) => {
      // Check for common doctor dashboard stats
      const statsCount = await dashboard.getStatsCardCount();
      expect(statsCount).toBeGreaterThan(0);
    });
  });

  test.describe('Patient Management', () => {
    test('should access patient list', async ({ page }) => {
      await dashboard.navigateTo('Patients');
      
      await expect(page).toHaveURL(/patient/i);
    });

    test('should view patient details', async ({ page }) => {
      await dashboard.navigateTo('Patients');
      
      // If patients exist, should be able to view details
      const patientRow = page.locator('table tbody tr, [data-testid="patient-row"]').first();
      
      if (await patientRow.isVisible()) {
        await patientRow.click();
        await page.waitForLoadState('networkidle');
        
        // Should show patient details
        await expect(page.locator('text=/patient|details|profile/i')).toBeVisible();
      }
    });
  });

  test.describe('Appointments', () => {
    test('should access appointments', async ({ page }) => {
      await dashboard.navigateTo('Appointments');
      
      await expect(page).toHaveURL(/appointment/i);
    });

    test('should view today\'s schedule', async ({ page }) => {
      await dashboard.navigateTo('Appointments');
      
      // Should show calendar or appointment list
      await expect(
        page.locator('[data-testid="appointments-list"], [data-testid="calendar"], table')
      ).toBeVisible();
    });
  });

  test.describe('Prescriptions', () => {
    test('should access prescriptions', async ({ page }) => {
      await dashboard.navigateTo('Prescriptions');
      
      await expect(page).toHaveURL(/prescription/i);
    });
  });

  test.describe('Lab Results', () => {
    test('should access lab results', async ({ page }) => {
      await dashboard.navigateTo('Lab');
      
      await expect(page).toHaveURL(/lab/i);
    });
  });

  test.describe('Permission Boundaries @security', () => {
    test('should not access admin settings', async ({ page }) => {
      // Try to navigate directly to admin area
      await page.goto('/admin/settings');
      
      // Should be redirected or show unauthorized
      await expect(page).not.toHaveURL(/admin\/settings/i);
    });

    test('should not access pharmacy inventory', async ({ page }) => {
      await page.goto('/pharmacy/inventory');
      
      // Should not have full pharmacy access
      const unauthorized = page.locator('text=/unauthorized|access denied|forbidden/i');
      if (await unauthorized.isVisible()) {
        expect(true).toBeTruthy();
      } else {
        // May redirect instead
        await expect(page).not.toHaveURL(/pharmacy\/inventory/i);
      }
    });
  });
});
