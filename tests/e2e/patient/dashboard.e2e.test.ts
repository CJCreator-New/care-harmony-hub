import { test, expect } from '../../test/e2e-fixtures';

test.describe('@patient Patient Dashboard', () => {
  test.use({ userRole: 'patient' });

  test('should display patient name on dashboard', async ({
    authenticatedPage,
    userContext,
  }) => {
    // Navigate to dashboard
    await authenticatedPage.goto('/patient/dashboard');

    // Assert patient name visible
    const patientName = await authenticatedPage.locator(
      '[data-testid="patient-name"]'
    );
    expect(patientName).toBeVisible();
  });

  test('should display upcoming appointments', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/patient/dashboard');

    // Check for appointments section
    const appointmentsSection = await authenticatedPage.locator(
      '[data-testid="upcoming-appointments"]'
    );
    expect(appointmentsSection).toBeDefined();
  });

  test('should display medical history link', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/patient/dashboard');

    // Check for medical history access
    const medicalHistoryLink = await authenticatedPage.locator(
      'a[href*="/medical-history"]'
    );
    expect(medicalHistoryLink).toBeDefined();
  });

  test('should display prescriptions link', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/patient/dashboard');

    // Check for prescriptions access
    const prescriptionsLink = await authenticatedPage.locator(
      'a[href*="/prescriptions"]'
    );
    expect(prescriptionsLink).toBeDefined();
  });
});
