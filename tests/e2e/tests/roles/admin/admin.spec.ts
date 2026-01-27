/**
 * Admin Role Tests
 * Tests specific to admin workflows and system management
 * 
 * @tags @admin @role
 */

import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from '../../../pages';
import { TEST_USERS } from '../../../config/test-users';

test.describe('Admin Role @admin @role', () => {
  let loginPage: LoginPage;
  let dashboard: DashboardPage;
  const admin = TEST_USERS.admin;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboard = new DashboardPage(page);
    
    await loginPage.navigate();
    await loginPage.loginAndWaitForDashboard(admin.email, admin.password);
  });

  test.describe('Dashboard Access @smoke', () => {
    test('should access admin dashboard', async ({ page }) => {
      const loaded = await dashboard.isDashboardLoaded();
      expect(loaded).toBeTruthy();
    });

    test('should display admin-specific stats', async ({ page }) => {
      const statsCount = await dashboard.getStatsCardCount();
      expect(statsCount).toBeGreaterThan(0);
    });
  });

  test.describe('User Management', () => {
    test('should access user management', async ({ page }) => {
      await dashboard.navigateTo('Users');
      
      await expect(page).toHaveURL(/user/i);
    });

    test('should view user list', async ({ page }) => {
      await dashboard.navigateTo('Users');
      
      // Should show users table
      await expect(page.locator('table, [data-testid="users-list"]')).toBeVisible();
    });

    test('should have ability to create user', async ({ page }) => {
      await dashboard.navigateTo('Users');
      
      // Should have add user button
      const addButton = page.getByRole('button', { name: /add|create|new/i });
      await expect(addButton).toBeVisible();
    });
  });

  test.describe('Settings Management', () => {
    test('should access system settings', async ({ page }) => {
      await dashboard.navigateTo('Settings');
      
      await expect(page).toHaveURL(/setting/i);
    });
  });

  test.describe('Reports & Analytics', () => {
    test('should access reports', async ({ page }) => {
      await dashboard.navigateTo('Reports');
      
      await expect(page).toHaveURL(/report/i);
    });

    test('should access analytics', async ({ page }) => {
      await dashboard.navigateTo('Analytics');
      
      await expect(page).toHaveURL(/analytic/i);
    });
  });

  test.describe('Audit Logs', () => {
    test('should access audit logs', async ({ page }) => {
      await dashboard.navigateTo('Audit');
      
      await expect(page).toHaveURL(/audit/i);
    });
  });

  test.describe('Full System Access @security', () => {
    test('should access all main modules', async ({ page }) => {
      const modules = ['Patients', 'Appointments', 'Pharmacy', 'Lab', 'Billing'];
      
      for (const module of modules) {
        await dashboard.navigateTo(module);
        await page.waitForLoadState('networkidle');
        
        // Should not show unauthorized message
        const unauthorized = page.locator('text=/unauthorized|access denied|forbidden/i');
        expect(await unauthorized.isVisible()).toBeFalsy();
      }
    });
  });
});
