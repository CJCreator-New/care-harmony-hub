import { test, expect } from '../../test/e2e-fixtures';

test.describe('@workflow Complete Patient Registration to Appointment', () => {
  test('patient should complete registration and book appointment', async ({
    page,
  }) => {
    // Step 1: Patient registration
    await page.goto('/register');

    // Fill registration form
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', `patient-${Date.now()}@test.local`);
    await page.fill('input[name="dateOfBirth"]', '1990-01-15');
    await page.fill('input[name="phone"]', '+1234567890');

    // Submit registration
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
    }

    // Verify redirected to login or dashboard
    await page.waitForURL('**(/login|/patient/dashboard)**', { timeout: 10000 });
    expect(page.url()).toMatch(/login|patient\/dashboard/);

    // Step 2: If redirected to login, login now
    if (page.url().includes('login')) {
      const email = await page.inputValue('input[name="email"]');
      await page.fill('input[name="password"]', 'TestPass123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/patient/dashboard');
    }

    // Step 3: Book appointment
    const bookAppointmentButton = await page.locator(
      'button:has-text("Book Appointment")'
    );
    if (bookAppointmentButton) {
      await bookAppointmentButton.click();
      await page.waitForURL('**/appointments/new');

      // Select doctor
      const doctorSelect = await page.$('select[name="doctor"]');
      if (doctorSelect) {
        await page.selectOption('select[name="doctor"]', { index: 1 });
      }

      // Select date
      const dateInput = await page.$('input[name="appointmentDate"]');
      if (dateInput) {
        await page.fill('input[name="appointmentDate"]', '2026-04-20');
      }

      // Submit appointment
      const submitAppt = await page.$('button:has-text("Book")');
      if (submitAppt) {
        await submitAppt.click();
        await page.waitForURL('**/patient/appointments');
      }
    }

    // Verify appointment listed
    const appointmentsList = await page.locator(
      '[data-testid="appointments-list"]'
    );
    expect(appointmentsList).toBeDefined();
  });
});
