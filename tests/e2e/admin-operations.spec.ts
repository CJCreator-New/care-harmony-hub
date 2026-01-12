import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Admin Operations', () => {
  test('should login as admin', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should view analytics dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.stats-card, [data-testid="stats"]')).toBeVisible();
  });

  test('should access staff management', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    
    await page.click('text=Staff');
    
    await expect(page).toHaveURL(/\/staff/);
    await expect(page.locator('h1, h2')).toContainText(/Staff|Team/);
  });
});
