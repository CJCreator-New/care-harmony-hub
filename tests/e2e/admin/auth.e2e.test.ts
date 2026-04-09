import { test, expect } from '../../test/e2e-fixtures';

test.describe('@admin Admin Authentication', () => {
  test.use({ userRole: 'admin' });

  test('should login as admin', async ({ page, userContext }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', userContext.user.email);
    await page.fill('input[name="password"]', userContext.user.password);

    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin/**');
    expect(page.url()).toContain('/admin');
  });

  test('should display admin dashboard', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/admin/dashboard');

    const adminPanel = await authenticatedPage.locator(
      '[data-testid="admin-panel"]'
    );
    expect(adminPanel).toBeDefined();
  });

  test('should display user management section', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/admin/users');

    const userList = await authenticatedPage.locator(
      '[data-testid="user-list"]'
    );
    expect(userList).toBeDefined();
  });

  test('should display audit logs', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/admin/audit-logs');

    const auditSection = await authenticatedPage.locator(
      '[data-testid="audit-logs"]'
    );
    expect(auditSection).toBeDefined();
  });
});
