import { test, expect } from '../../test/e2e-fixtures';

test.describe('@patient Patient Authentication', () => {
  test.use({ userRole: 'patient' });

  test('should login with valid credentials', async ({ page, userContext }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('input[name="mrn"]', userContext.user.email);
    await page.fill('input[name="password"]', userContext.user.password);

    // Submit
    await page.click('button[type="submit"]');

    // Assert: redirected to dashboard
    await page.waitForURL('**/patient/dashboard');
    expect(page.url()).toContain('/patient/dashboard');
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="mrn"]', 'INVALID123');
    await page.fill('input[name="password"]', 'wrongpass');

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
    await page.fill('input[name="mrn"]', userContext.user.email);
    await page.fill('input[name="password"]', userContext.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/patient/dashboard');

    // Reload page
    await page.reload();

    // Assert: still logged in
    expect(page.url()).toContain('/patient/dashboard');
  });

  test('should logout successfully', async ({ page, userContext }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="mrn"]', userContext.user.email);
    await page.fill('input[name="password"]', userContext.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/patient/dashboard');

    // Logout
    const userMenu = await page.$('[data-testid="user-menu"]');
    if (userMenu) {
      await userMenu.click();
      await page.click('[data-testid="logout-btn"]');
    }

    // Assert: redirected to login
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });
});
