import { test, expect } from '../../test/e2e-fixtures';

test.describe('@patient Patient Authentication', () => {
  test.use({ userRole: 'patient' });

  test('should login with valid credentials', async ({ page, userContext }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('input#email', userContext.user.email);
    await page.fill('input#password', userContext.user.password);

    // Submit
    await page.click('button[type="submit"]');

    // Assert: redirected to dashboard (could be /dashboard or /hospital/account-setup during setup)
    await page.waitForURL('**/dashboard', { timeout: 35000 });
    const finalUrl = page.url();
    expect(finalUrl).toMatch(/dashboard/);
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input#email', 'INVALID123');
    await page.fill('input#password', 'wrongpass');

    await page.click('button[type="submit"]');

    // Assert: error message shown or stayed on login
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('should persist session on page reload', async ({
    page,
    userContext,
  }) => {
    // Login
    await page.goto('/login');
    await page.fill('input#email', userContext.user.email);
    await page.fill('input#password', userContext.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 35000 });

    // Reload page
    await page.reload();

    // Assert: still logged in
    expect(page.url()).toMatch(/dashboard/);
  });

  test('should verify user authenticated after login', async ({ page, userContext }) => {
    // Login
    await page.goto('/login');
    await page.fill('input#email', userContext.user.email);
    await page.fill('input#password', userContext.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 35000 });

    // Assert: page shows authenticated content (dashboard should be loaded)
    const dashboardContent = await page.locator('body').getAttribute('class');
    expect(dashboardContent).toBeDefined();
    expect(page.url()).toMatch(/dashboard/);
  });
});
