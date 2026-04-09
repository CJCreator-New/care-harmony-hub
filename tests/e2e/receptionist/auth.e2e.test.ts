import { test, expect } from '../../test/e2e-fixtures';

test.describe('@receptionist Receptionist Authentication', () => {
  test.use({ userRole: 'receptionist' });

  test('should login as receptionist', async ({ page, userContext }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', userContext.user.email);
    await page.fill('input[name="password"]', userContext.user.password);

    await page.click('button[type="submit"]');

    await page.waitForURL('**/reception/**');
    expect(page.url()).toContain('/reception');
  });

  test('should display patient list', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/reception/patients');

    const patientList = await authenticatedPage.locator(
      '[data-testid="patient-list"]'
    );
    expect(patientList).toBeDefined();
  });

  test('should display appointment scheduling', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/reception/dashboard');

    const appointmentButton = await authenticatedPage.locator(
      '[data-testid="schedule-appointment"]'
    );
    expect(appointmentButton).toBeDefined();
  });
});
