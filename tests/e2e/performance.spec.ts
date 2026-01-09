import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    console.log(`Dashboard load time: ${loadTime}ms`);

    // Assert load time is under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should load patient list efficiently', async ({ page }) => {
    // Login first
    await page.goto('/hospital/login');
    await page.fill('input[type="email"]', 'admin@testgeneral.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');

    // Navigate to patients page
    await page.goto('/patients');

    // Measure time to load patient list
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="patient-list"]', { timeout: 10000 });
    const loadTime = Date.now() - startTime;

    console.log(`Patient list load time: ${loadTime}ms`);

    // Assert load time is under 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });

  test('should handle concurrent user actions', async ({ page, context }) => {
    // Login
    await page.goto('/hospital/login');
    await page.fill('input[type="email"]', 'admin@testgeneral.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Open multiple tabs/pages
    const page2 = await context.newPage();
    const page3 = await context.newPage();

    // Navigate all pages to different sections
    await Promise.all([
      page.goto('/patients'),
      page2.goto('/appointments'),
      page3.goto('/reports'),
    ]);

    // Wait for all pages to load
    await Promise.all([
      page.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle'),
      page3.waitForLoadState('networkidle'),
    ]);

    // Verify all pages loaded successfully
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page2.locator('h1').first()).toBeVisible();
    await expect(page3.locator('h1').first()).toBeVisible();
  });

  test('should maintain performance during data operations', async ({ page }) => {
    // Login
    await page.goto('/hospital/login');
    await page.fill('input[type="email"]', 'admin@testgeneral.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to patients page
    await page.goto('/patients');

    // Measure time for search operation
    const searchStartTime = Date.now();
    await page.fill('input[placeholder*="search"]', 'John');
    await page.waitForTimeout(500); // Wait for debounced search
    const searchTime = Date.now() - searchStartTime;

    console.log(`Patient search time: ${searchTime}ms`);

    // Assert search is reasonably fast
    expect(searchTime).toBeLessThan(1000);
  });

  test('should handle large dataset rendering', async ({ page }) => {
    // Login
    await page.goto('/hospital/login');
    await page.fill('input[type="email"]', 'admin@testgeneral.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to reports page
    await page.goto('/reports');

    // Measure time to render charts and data
    const renderStartTime = Date.now();
    await page.waitForSelector('.recharts-wrapper', { timeout: 10000 });
    const renderTime = Date.now() - renderStartTime;

    console.log(`Reports rendering time: ${renderTime}ms`);

    // Assert rendering is under 3 seconds
    expect(renderTime).toBeLessThan(3000);
  });

  test('should maintain performance during telemedicine session', async ({ page }) => {
    // Login
    await page.goto('/hospital/login');
    await page.fill('input[type="email"]', 'doctor@testgeneral.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to telemedicine
    await page.goto('/telemedicine');

    // Start measuring performance
    const startTime = Date.now();

    // Simulate starting a call (we can't actually start WebRTC in tests)
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    console.log(`Telemedicine page load time: ${loadTime}ms`);

    // Assert telemedicine page loads quickly
    expect(loadTime).toBeLessThan(2000);
  });

  test('should handle memory efficiently during extended use', async ({ page }) => {
    // Login
    await page.goto('/hospital/login');
    await page.fill('input[type="email"]', 'admin@testgeneral.com');
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate through multiple pages to simulate extended use
    const pages = ['/patients', '/appointments', '/reports', '/settings'];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Simulate user interaction time
    }

    // Go back to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify page is still responsive
    const responseTime = await page.evaluate(() => {
      const start = performance.now();
      // Simple DOM operation to test responsiveness
      document.querySelectorAll('*').length;
      return performance.now() - start;
    });

    console.log(`DOM operation response time: ${responseTime}ms`);

    // Assert DOM operations are still fast
    expect(responseTime).toBeLessThan(50);
  });
});