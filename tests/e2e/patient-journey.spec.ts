import { test, expect } from '@playwright/test';
import { testUsers, generatePatient } from './fixtures/test-data';

test.describe('Patient Journey', () => {
  test('should complete patient registration', async ({ page }) => {
    const patient = generatePatient();
    
    await page.goto('/patient/register');
    
    await page.fill('input[name="email"]', patient.email);
    await page.fill('input[name="password"]', patient.password);
    await page.fill('input[name="firstName"]', patient.firstName);
    await page.fill('input[name="lastName"]', patient.lastName);
    await page.fill('input[name="phone"]', patient.phone);
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/patient\/dashboard/, { timeout: 10000 });
  });

  test('should login and view dashboard', async ({ page }) => {
    await page.goto('/patient/login');
    
    await page.fill('input[name="email"]', testUsers.patient.email);
    await page.fill('input[name="password"]', testUsers.patient.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/patient\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should book an appointment', async ({ page }) => {
    await page.goto('/patient/login');
    await page.fill('input[name="email"]', testUsers.patient.email);
    await page.fill('input[name="password"]', testUsers.patient.password);
    await page.click('button[type="submit"]');
    
    await page.click('text=Appointments');
    await page.click('text=Book Appointment');
    
    await page.selectOption('select[name="doctor"]', { index: 1 });
    await page.fill('textarea[name="reason"]', 'Annual checkup');
    await page.click('button:has-text("Confirm")');
    
    await expect(page.locator('.success-message, .toast')).toBeVisible({ timeout: 5000 });
  });
});
