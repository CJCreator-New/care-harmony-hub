import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Doctor Workflow', () => {
  test('should login as doctor', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', testUsers.doctor.email);
    await page.fill('input[name="password"]', testUsers.doctor.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should view patient list', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', testUsers.doctor.email);
    await page.fill('input[name="password"]', testUsers.doctor.password);
    await page.click('button[type="submit"]');
    
    await page.click('text=Patients');
    
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount({ timeout: 5000 });
  });

  test('should start consultation', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', testUsers.doctor.email);
    await page.fill('input[name="password"]', testUsers.doctor.password);
    await page.click('button[type="submit"]');
    
    await page.click('text=Consultations');
    await page.click('button:has-text("Start Consultation")').first();
    
    await expect(page).toHaveURL(/\/consultations/);
    await expect(page.locator('h2')).toContainText('Consultation');
  });
});
