import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Billing Flow', () => {
  test('should view billing dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    
    await page.click('text=Billing');
    
    await expect(page).toHaveURL(/\/billing/);
  });

  test('should generate invoice', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    
    await page.click('text=Billing');
    await page.click('button:has-text("New Invoice")');
    
    await expect(page.locator('form, [role="dialog"]')).toBeVisible();
  });

  test('should view invoice list', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    
    await page.click('text=Billing');
    
    await expect(page.locator('table, .invoice-list')).toBeVisible();
  });
});
