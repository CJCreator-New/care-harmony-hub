// tests/compatibility/browser-compatibility.spec.ts
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Desktop Chrome'] });
test.describe('Chrome Compatibility', () => {
	test('should render dashboard', async ({ page }) => {
		await page.goto('/dashboard');
		await expect(page.locator('h1')).toContainText(['Dashboard', 'Welcome']);
	});
});

test.use({ ...devices['Desktop Firefox'] });
test.describe('Firefox Compatibility', () => {
	test('should render dashboard', async ({ page }) => {
		await page.goto('/dashboard');
		await expect(page.locator('h1')).toContainText(['Dashboard', 'Welcome']);
	});
});

test.use({ ...devices['iPhone 13'] });
test.describe('Mobile Compatibility', () => {
	test('should render dashboard', async ({ page }) => {
		await page.goto('/dashboard');
		await expect(page.locator('h1')).toContainText(['Dashboard', 'Welcome']);
	});
});
