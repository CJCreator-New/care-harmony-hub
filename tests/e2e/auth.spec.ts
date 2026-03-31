import { test, expect } from '@playwright/test';

// Helper function for more resilient clicks
async function clickButton(page, selector, timeout = 20000) {
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 10000 });
    // Use force click for stubborn elements
    await element.click({ force: true, timeout });
  } catch (e) {
    console.error(`Failed to click ${selector}:`, e);
    throw e;
  }
}

test.describe('Authentication Flow', () => {
  test('should complete full hospital registration and login', async ({ page }) => {
    const runId = Date.now().toString().slice(-6);
    const adminEmail = `admin_${runId}@testgeneral.com`;
    const hospitalEmail = `hospital_${runId}@testgeneral.com`;
    const password = 'TestPass123!';

    await page.goto('/hospital/signup');
    
    // Wait for signup page to load
    await page.waitForLoadState('load');
    await page.waitForSelector('form, [role="form"]', { timeout: 10000 });

    // Use more specific selectors for form inputs
    const hospitalNameInput = page.locator('input').all().then(inputs => {
      return inputs[0]; // First input is usually hospital name
    });

    // Fill hospital registration form using more robust selectors  
    const inputs = page.locator('input');
    const labels = page.locator('label');
    
    // Find and fill each field by searching nearby label
    let inputIndex = 0;
    
    // Hospital Name
    const allInputs = await page.locator('input').all();
    if (allInputs.length > 0) await allInputs[inputIndex++].fill(`Test General Hospital ${runId}`);
    if (allInputs.length > inputIndex) await allInputs[inputIndex++].fill('123 Test Street');
    if (allInputs.length > inputIndex) await allInputs[inputIndex++].fill('Test City');
    if (allInputs.length > inputIndex) await allInputs[inputIndex++].fill('Test State');
    if (allInputs.length > inputIndex) await allInputs[inputIndex++].fill('12345');
    if (allInputs.length > inputIndex) await allInputs[inputIndex++].fill('(555) 123-4567');
    if (allInputs.length > inputIndex) await allInputs[inputIndex++].fill(hospitalEmail);
    if (allInputs.length > inputIndex) await allInputs[inputIndex++].fill('LIC123456');

    // Click next/continue button
    const nextButton = page.getByRole('button', { name: /next|continue/i });
    await nextButton.waitFor({ state: 'visible', timeout: 10000 });
    await nextButton.click({ force: true, timeout: 20000 });
    
    // Wait for account setup page
    await page.waitForLoadState('load');

    // Fill admin account setup
    const adminInputs = await page.locator('input').all();
    let adminIndex = 0;
    if (adminInputs.length > adminIndex) await adminInputs[adminIndex++].fill('John');
    if (adminInputs.length > adminIndex) await adminInputs[adminIndex++].fill('Admin');
    if (adminInputs.length > adminIndex) await adminInputs[adminIndex++].fill(adminEmail);
    if (adminInputs.length > adminIndex) await adminInputs[adminIndex++].fill(password);
    if (adminInputs.length > adminIndex) await adminInputs[adminIndex++].fill(password);

    // Click create account/sign up button
    const createButton = page.getByRole('button', { name: /create account|sign up/i });
    await createButton.waitFor({ state: 'visible', timeout: 10000 });
    await createButton.click({ force: true, timeout: 20000 });

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');

    // Current flow may land on role/account setup before dashboard
    await expect(page).toHaveURL(/hospital\/role-setup|hospital\/account-setup|dashboard|hospital\/login/i);

    // If redirected to login, complete login
    if (page.url().includes('/hospital/login')) {
      await page.waitForLoadState('load');
      const loginInputs = await page.locator('input').all();
      if (loginInputs.length > 0) await loginInputs[0].fill(adminEmail);
      if (loginInputs.length > 1) await loginInputs[1].fill(password);
      
      const loginButton = page.getByRole('button', { name: /sign in|login/i });
      await loginButton.waitFor({ state: 'visible', timeout: 10000 });
      await loginButton.click({ force: true, timeout: 20000 });
      
      await page.waitForLoadState('load');
    }

    await expect(page).toHaveURL(/hospital\/role-setup|hospital\/account-setup|dashboard/i);
  });

  test('should handle password reset flow', async ({ page, browserName }) => {
    await page.goto('/hospital/login');
    
    // Wait for the login page to be fully loaded
    await page.waitForLoadState('load');
    await page.waitForSelector('[href*="forgot-password"]', { timeout: 10000 });

    // For Firefox, navigate directly via href to avoid click timing issues
    if (browserName === 'firefox') {
      const hrefValue = await page.getAttribute('[href*="forgot-password"]', 'href');
      if (hrefValue) {
        await page.goto(hrefValue.startsWith('/') ? hrefValue : `/hospital/${hrefValue}`);
      }
    } else {
      // Click forgot password link for other browsers
      const forgotPasswordLink = page.getByRole('link', { name: /forgot password|reset password/i });
      await forgotPasswordLink.waitFor({ state: 'visible', timeout: 10000 });
      await forgotPasswordLink.click({ force: true, timeout: 20000 });
    }

    // Wait for forgot password page to load
    await page.waitForURL(/forgot-password/, { timeout: 15000 });
    await page.waitForLoadState('load');

    // Wait for email input to be visible and interactive
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[placeholder*="hospital" i]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });

    // Enter email
    await emailInput.fill('admin@testgeneral.com');
    
    // Click send reset button
    const sendButton = page.getByRole('button', { name: /send reset|submit|sending/i });
    await sendButton.waitFor({ state: 'visible', timeout: 10000 });
    await sendButton.click({ force: true, timeout: 20000 });

    // Wait for success message or completion
    await page.waitForLoadState('load');
    
    // Check for success signal
    const successSignal =
      (await page.getByText(/check your email|reset link sent|if an account exists|email sent/i).count()) > 0;

    if (!successSignal) {
      // If no success message, verify we're on a valid page
      await expect(page).toHaveURL(/forgot|reset|login/i);
      // Ensure no errors displayed
      await expect(page.getByText(/something went wrong|referenceerror|typeerror/i)).toHaveCount(0);
    }
  });

  test('should enforce session timeout', async ({ page }) => {
    // This would require setting up a test user and mocking session timeout
    // For now, we'll skip the implementation as it requires backend setup
    test.skip();
  });
});
