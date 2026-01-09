import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should complete full hospital registration and login', async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');

    // Click on "Get Started" or hospital signup
    await page.getByRole('link', { name: /sign up|register|get started/i }).click();

    // Fill hospital registration form
    await page.getByLabel('Hospital Name').fill('Test General Hospital');
    await page.getByLabel('Address').fill('123 Test Street');
    await page.getByLabel('City').fill('Test City');
    await page.getByLabel('State').fill('Test State');
    await page.getByLabel('ZIP Code').fill('12345');
    await page.getByLabel('Phone').fill('(555) 123-4567');
    await page.getByLabel('Email').fill('admin@testgeneral.com');
    await page.getByLabel('License Number').fill('LIC123456');

    await page.getByRole('button', { name: /next|continue/i }).click();

    // Admin account setup
    await page.getByLabel('First Name').fill('John');
    await page.getByLabel('Last Name').fill('Admin');
    await page.getByLabel('Email').fill('admin@testgeneral.com');
    await page.getByLabel('Password').fill('TestPass123!');
    await page.getByLabel('Confirm Password').fill('TestPass123!');

    await page.getByRole('button', { name: /create account|sign up/i }).click();

    // Should redirect to login or dashboard
    await expect(page).toHaveURL(/\/login|\/dashboard/);

    // If redirected to login, complete login
    if (page.url().includes('/login')) {
      await page.getByLabel('Email').fill('admin@testgeneral.com');
      await page.getByLabel('Password').fill('TestPass123!');
      await page.getByRole('button', { name: /sign in|login/i }).click();
    }

    // Should be on admin dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/login');

    // Click forgot password
    await page.getByRole('link', { name: /forgot password|reset password/i }).click();

    // Enter email
    await page.getByLabel('Email').fill('admin@testgeneral.com');
    await page.getByRole('button', { name: /send reset|reset/i }).click();

    // Should show success message
    await expect(page.getByText(/check your email|reset link sent/i)).toBeVisible();
  });

  test('should enforce session timeout', async ({ page }) => {
    // This would require setting up a test user and mocking session timeout
    // For now, we'll skip the implementation as it requires backend setup
    test.skip();
  });
});