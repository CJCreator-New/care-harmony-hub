import { test, expect } from '../../test/e2e-fixtures';

test.describe('@laboratory Lab Technician Authentication', () => {
  test.use({ userRole: 'laboratory' });

  test('should login as lab technician', async ({ page, userContext }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', userContext.user.email);
    await page.fill('input[name="password"]', userContext.user.password);

    await page.click('button[type="submit"]');

    await page.waitForURL('**/lab/**');
    expect(page.url()).toContain('/lab');
  });

  test('should display lab orders', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/lab/orders');

    const ordersSection = await authenticatedPage.locator(
      '[data-testid="lab-orders"]'
    );
    expect(ordersSection).toBeDefined();
  });

  test('should display specimen processing section', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/lab/dashboard');

    const specimenSection = await authenticatedPage.locator(
      '[data-testid="specimens"]'
    );
    expect(specimenSection).toBeDefined();
  });
});
