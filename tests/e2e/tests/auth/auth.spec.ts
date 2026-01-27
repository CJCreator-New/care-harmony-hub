/**
 * Authentication Tests
 * Tests for login, logout, session management, and access control
 * 
 * @tags @smoke @critical @auth
 */

import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from '../../pages';
import { TEST_USERS, UserRole } from '../../config/test-users';

test.describe('Authentication @auth', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  test.describe('Login Flow @smoke @critical', () => {
    test('should display login page correctly', async ({ page }) => {
      await expect(page).toHaveURL(/login/i);
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      const user = TEST_USERS.doctor;
      
      await loginPage.loginAndWaitForDashboard(user.email, user.password);
      
      await expect(page).toHaveURL(/dashboard|home/i);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await loginPage.login('invalid@email.com', 'wrongpassword');
      
      const error = await loginPage.getErrorMessage();
      expect(error).toBeTruthy();
    });

    test('should show validation for empty fields', async ({ page }) => {
      await loginPage.submitButton.click();
      
      // Should not navigate away
      await expect(page).toHaveURL(/login/i);
    });

    test('should show error for invalid email format', async ({ page }) => {
      await loginPage.emailInput.fill('notanemail');
      await loginPage.passwordInput.fill('password123');
      await loginPage.submitButton.click();
      
      // Check for validation
      const emailInvalid = await loginPage.emailInput.evaluate((el: HTMLInputElement) => !el.checkValidity());
      expect(emailInvalid).toBeTruthy();
    });
  });

  test.describe('Logout Flow', () => {
    test('should logout successfully', async ({ page }) => {
      const user = TEST_USERS.doctor;
      const dashboard = new DashboardPage(page);
      
      // Login first
      await loginPage.loginAndWaitForDashboard(user.email, user.password);
      
      // Logout
      await dashboard.logout();
      
      await expect(page).toHaveURL(/login/i);
    });
  });

  test.describe('Session Management', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/login/i);
    });

    test('should maintain session across page refresh', async ({ page }) => {
      const user = TEST_USERS.doctor;
      
      await loginPage.loginAndWaitForDashboard(user.email, user.password);
      
      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should still be logged in
      await expect(page).not.toHaveURL(/login/i);
    });
  });

  test.describe('Role-Based Access @critical', () => {
    const roleTests: { role: UserRole; expectedPath: RegExp }[] = [
      { role: 'admin', expectedPath: /admin|dashboard/i },
      { role: 'doctor', expectedPath: /doctor|dashboard/i },
      { role: 'nurse', expectedPath: /nurse|dashboard/i },
      { role: 'receptionist', expectedPath: /reception|dashboard/i },
      { role: 'pharmacist', expectedPath: /pharmacy|dashboard/i },
      { role: 'lab_tech', expectedPath: /lab|dashboard/i },
      { role: 'patient', expectedPath: /patient|portal|dashboard/i },
    ];

    for (const { role, expectedPath } of roleTests) {
      test(`should login and redirect ${role} to correct dashboard`, async ({ page }) => {
        const user = TEST_USERS[role];
        
        await loginPage.loginAndWaitForDashboard(user.email, user.password);
        
        // Verify redirect
        await expect(page).toHaveURL(expectedPath);
      });
    }
  });

  test.describe('Password Reset', () => {
    test('should navigate to forgot password page', async ({ page }) => {
      await loginPage.clickForgotPassword();
      
      await expect(page).toHaveURL(/forgot|reset|password/i);
    });
  });

  test.describe('Registration', () => {
    test('should navigate to registration page', async ({ page }) => {
      // Skip if no register link
      if (!(await loginPage.registerLink.isVisible())) {
        test.skip();
        return;
      }
      
      await loginPage.clickRegister();
      
      await expect(page).toHaveURL(/register|signup/i);
    });
  });
});
