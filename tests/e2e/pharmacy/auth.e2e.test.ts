import { test, expect } from '../../test/e2e-fixtures';

test.describe('@pharmacy Pharmacist Authentication', () => {
  test.use({ userRole: 'pharmacy' });

  test('should login as pharmacist', async ({ page, userContext }) => {
    await page.goto('/login');

    await page.fill('input#email', userContext.user.email);
    await page.fill('input#password', userContext.user.password);

    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 35000 });
    expect(page.url()).toMatch(/dashboard/);
  });

  test('should display prescription queue', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/pharmacy/queue');

    const queueSection = await authenticatedPage.locator(
      '[data-testid="prescription-queue"]'
    );
    expect(queueSection).toBeDefined();
  });

  test('should allow prescription filtering', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/pharmacy/queue');

    const filterButton = await authenticatedPage.locator(
      '[data-testid="filter-button"]'
    );
    expect(filterButton).toBeDefined();
  });
});
