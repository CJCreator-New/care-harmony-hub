import { test, expect } from '../../test/e2e-fixtures';

test.describe('@doctor Doctor Authentication', () => {
  test.use({ userRole: 'doctor' });

  test('should login as doctor with valid credentials', async ({
    page,
    userContext,
  }) => {
    await page.goto('/login');

    await page.fill('input#email', userContext.user.email);
    await page.fill('input#password', userContext.user.password);

    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 35000 });
    expect(page.url()).toMatch(/dashboard/);
  });

  test('should display doctor name on dashboard', async ({
    authenticatedPage,
    userContext,
  }) => {
    await authenticatedPage.goto('/doctor/dashboard');

    const doctorName = await authenticatedPage.locator(
      '[data-testid="doctor-name"]'
    );
    expect(doctorName).toBeDefined();
  });

  test('should allow access to patient search', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/doctor/dashboard');

    const patientSearchLink = await authenticatedPage.locator(
      'a[href*="/patients"]'
    );
    expect(patientSearchLink).toBeDefined();
  });

  test('should display prescription management', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/doctor/dashboard');

    const prescriptionSection = await authenticatedPage.locator(
      '[data-testid="prescriptions-section"]'
    );
    expect(prescriptionSection).toBeDefined();
  });
});
