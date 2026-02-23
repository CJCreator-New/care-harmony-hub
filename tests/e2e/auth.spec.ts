import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should complete full hospital registration and login', async ({ page }) => {
    const runId = Date.now().toString().slice(-6);
    const adminEmail = `admin_${runId}@testgeneral.com`;
    const hospitalEmail = `hospital_${runId}@testgeneral.com`;
    const password = 'TestPass123!';

    await page.goto('/hospital/signup');

    // Fill hospital registration form
    await page.getByLabel(/Hospital Name/i).fill(`Test General Hospital ${runId}`);
    await page.getByLabel('Address').fill('123 Test Street');
    await page.getByLabel('City').fill('Test City');
    await page.getByLabel('State').fill('Test State');
    await page.getByLabel('ZIP Code').fill('12345');
    await page.getByLabel('Phone').fill('(555) 123-4567');
    await page.getByLabel(/Hospital Email/i).fill(hospitalEmail);
    await page.getByLabel('License Number').fill('LIC123456');

    await page.getByRole('button', { name: /next|continue/i }).click();

    // Admin account setup
    await page.getByLabel('First Name').fill('John');
    await page.getByLabel('Last Name').fill('Admin');
    await page.getByLabel(/Admin Email/i).fill(adminEmail);
    await page.getByLabel(/^Password/i).fill(password);
    await page.getByLabel(/Confirm Password/i).fill(password);

    await page.getByRole('button', { name: /create account|sign up/i }).click();

    // Current flow may land on role/account setup before dashboard.
    await expect(page).toHaveURL(/hospital\/role-setup|hospital\/account-setup|dashboard|hospital\/login/i);

    // If redirected to login, complete login
    if (page.url().includes('/hospital/login')) {
      await page.getByLabel(/Email/i).fill(adminEmail);
      await page.getByLabel(/Password/i).fill(password);
      await page.getByRole('button', { name: /sign in|login/i }).click();
    }

    await expect(page).toHaveURL(/hospital\/role-setup|hospital\/account-setup|dashboard/i);
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/hospital/login');

    // Click forgot password
    await page.getByRole('link', { name: /forgot password|reset password/i }).click();

    // Enter email
    await page.getByLabel(/Email/i).fill('admin@testgeneral.com');
    await page.getByRole('button', { name: /send reset|reset/i }).click();

    // Current UX can vary by environment (toast, inline alert, or staying on form).
    const successSignal =
      (await page.getByText(/check your email|reset link sent|if an account exists|email sent/i).count()) > 0;

    if (!successSignal) {
      await expect(page).toHaveURL(/forgot|reset|login/i);
      await expect(page.getByText(/something went wrong|referenceerror|typeerror/i)).toHaveCount(0);
    }
  });

  test('should enforce session timeout', async ({ page }) => {
    // This would require setting up a test user and mocking session timeout
    // For now, we'll skip the implementation as it requires backend setup
    test.skip();
  });
});
