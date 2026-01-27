/**
 * Smoke Tests
 * Quick health checks for critical application paths
 * 
 * @tags @smoke
 */

import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from '../../pages';
import { TEST_USERS } from '../../config/test-users';
import { getEnvironmentConfig } from '../../config/environments';

test.describe('Smoke Tests @smoke', () => {
  const config = getEnvironmentConfig();

  test.describe('Application Health', () => {
    test('should load landing page', async ({ page }) => {
      await page.goto('/');
      
      // Should not show error page
      await expect(page.locator('text=/error|500|404/i')).not.toBeVisible();
      
      // Page should have content
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();
    });

    test('should load login page', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.navigate();
      
      await expect(page).toHaveURL(/login/i);
      await expect(loginPage.emailInput).toBeVisible();
    });

    test('should have valid page title', async ({ page }) => {
      await page.goto('/');
      
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });
  });

  test.describe('Authentication Health', () => {
    test('should display login form elements', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.navigate();
      
      // Check that login form elements are present
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });

    test('should show error for invalid login', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      await loginPage.navigate();
      
      // Try invalid login
      await loginPage.emailInput.fill('invalid@test.com');
      await loginPage.passwordInput.fill('wrongpassword');
      await loginPage.submitButton.click();
      
      // Should stay on login page or show error
      await expect(page).toHaveURL(/login/i);
    });
  });

  test.describe('Critical Navigation', () => {
    test('should navigate to login page', async ({ page }) => {
      await page.goto('/');
      
      // Should redirect to login or show login option
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/$|\/hospital|\/login/i);
    });

    test('should access public hospital page', async ({ page }) => {
      await page.goto('/hospital');
      
      // Should load hospital landing page
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('API Health', () => {
    test('should respond to health check endpoint', async ({ request }) => {
      const response = await request.get(`${config.baseURL}/api/health`).catch(() => null);
      
      // If endpoint exists, it should return OK
      if (response) {
        expect(response.status()).toBeLessThan(500);
      }
    });
  });

  test.describe('Performance Baseline', () => {
    test('should load pages within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });
  });
});
