import { test, expect } from '@playwright/test';

test.describe('Appointment Scheduling', () => {
  test.beforeEach(async ({ page }) => {
    // Login as receptionist
    await page.goto('/login');
    await page.getByLabel('Email').fill('receptionist@testgeneral.com');
    await page.getByLabel('Password').fill('TestPass123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('should schedule new appointment', async ({ page }) => {
    // Navigate to appointments
    await page.getByRole('link', { name: /appointments|scheduling/i }).click();

    // Click schedule new appointment
    await page.getByRole('button', { name: /new appointment|schedule/i }).click();

    // Select patient
    await page.getByLabel('Patient').click();
    await page.getByText('Jane Doe').click();

    // Select doctor
    await page.getByLabel('Doctor').click();
    await page.getByText('Dr. Smith').click();

    // Select date and time
    await page.getByLabel('Date').fill('2026-01-15');
    await page.getByLabel('Time').fill('10:00');

    // Select appointment type
    await page.getByLabel('Type').selectOption('follow-up');

    // Add notes
    await page.getByLabel('Notes').fill('Follow-up for hypertension management');

    // Schedule
    await page.getByRole('button', { name: /schedule|book/i }).click();

    // Should show success
    await expect(page.getByText(/appointment scheduled|booked successfully/i)).toBeVisible();
  });

  test('should view appointment calendar', async ({ page }) => {
    await page.getByRole('link', { name: /appointments|calendar/i }).click();

    // Should show calendar view
    await expect(page.getByText(/calendar|schedule/i)).toBeVisible();

    // Check for today's appointments
    await expect(page.getByText('Jane Doe')).toBeVisible();
    await expect(page.getByText('10:00')).toBeVisible();
  });

  test('should check in patient for appointment', async ({ page }) => {
    await page.getByRole('link', { name: /appointments/i }).click();

    // Find today's appointment
    await page.getByText('Jane Doe').click();

    // Click check-in
    await page.getByRole('button', { name: /check-in|arrived/i }).click();

    // Should update status
    await expect(page.getByText(/checked in|arrived/i)).toBeVisible();
  });

  test('should handle walk-in patient registration', async ({ page }) => {
    await page.getByRole('link', { name: /appointments|queue/i }).click();

    // Click walk-in registration
    await page.getByRole('button', { name: /walk-in|urgent/i }).click();

    // Quick patient registration
    await page.getByLabel('First Name').fill('Walk-in');
    await page.getByLabel('Last Name').fill('Patient');
    await page.getByLabel('Phone').fill('(555) 000-1111');

    // Select urgency
    await page.getByLabel('Urgency').selectOption('urgent');

    // Register and add to queue
    await page.getByRole('button', { name: /register|add to queue/i }).click();

    // Should show in queue
    await expect(page.getByText('Walk-in Patient')).toBeVisible();
    await expect(page.getByText(/urgent|high priority/i)).toBeVisible();
  });
});