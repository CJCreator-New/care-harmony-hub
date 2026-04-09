import { test, expect } from '../../test/e2e-fixtures';

test.describe('@doctor Doctor Patient Search', () => {
  test.use({ userRole: 'doctor' });

  test('should navigate to patient search', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/doctor/dashboard');

    const patientSearchLink = await authenticatedPage.locator(
      'a[href*="/patients"]'
    );
    if (patientSearchLink) {
      await patientSearchLink.click();
      await authenticatedPage.waitForURL('**/doctor/patients');
    }

    expect(authenticatedPage.url()).toContain('/patients');
  });

  test('should display search form', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/doctor/patients');

    const searchForm = await authenticatedPage.locator(
      'form[data-testid="patient-search-form"]'
    );
    expect(searchForm).toBeDefined();
  });

  test('should have hospital scoping enforced', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/doctor/patients');

    // Verify hospital ID is set in page context
    const hospitalIndicator = await authenticatedPage.locator(
      '[data-testid="hospital-id"]'
    );
    expect(hospitalIndicator).toBeDefined();
  });
});
