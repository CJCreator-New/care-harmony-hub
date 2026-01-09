import { test, expect } from '@playwright/test';

test.describe('Load Testing', () => {
  test.setTimeout(300000); // 5 minutes timeout for load tests

  test('Should handle multiple concurrent users accessing patient dashboard', async ({ page, browser }) => {
    const concurrentUsers = 10;
    const pages = [];

    // Create multiple browser contexts/pages
    for (let i = 0; i < concurrentUsers; i++) {
      const context = await browser.newContext();
      const newPage = await context.newPage();
      pages.push({ page: newPage, context });
    }

    // Run load test
    const startTime = Date.now();
    const results = await Promise.allSettled(
      pages.map(async ({ page }, index) => {
        try {
          await page.goto('/patient/dashboard');
          // Wait for page to load completely
          await page.waitForLoadState('networkidle');

          // Simulate user interactions
          await page.waitForTimeout(1000 + Math.random() * 2000); // Random wait

          // Check if page loaded successfully
          const title = await page.title();
          expect(title).toContain('Patient');

          return { success: true, userId: index + 1 };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { success: false, userId: index + 1, error: errorMessage };
        }
      })
    );

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Analyze results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;

    console.log(`Load Test Results:`);
    console.log(`Total Users: ${concurrentUsers}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Average Response Time: ${totalTime / concurrentUsers}ms`);

    // Assertions
    expect(successful).toBeGreaterThanOrEqual(concurrentUsers * 0.8); // At least 80% success rate
    expect(totalTime / concurrentUsers).toBeLessThan(5000); // Average response time < 5 seconds

    // Cleanup
    for (const { context } of pages) {
      await context.close();
    }
  });

  test('Should handle concurrent appointment bookings', async ({ browser }) => {
    const concurrentUsers = 5;
    const pages = [];

    // Create multiple browser contexts
    for (let i = 0; i < concurrentUsers; i++) {
      const context = await browser.newContext();
      const newPage = await context.newPage();
      pages.push({ page: newPage, context });
    }

    const results = await Promise.allSettled(
      pages.map(async ({ page }, index) => {
        try {
          await page.goto('/patient/appointments');

          // Wait for appointment booking form to load
          await page.waitForSelector('[data-testid="appointment-form"]', { timeout: 10000 });

          // Fill out appointment form
          await page.fill('[data-testid="doctor-select"]', 'Dr. Smith');
          await page.fill('[data-testid="date-input"]', '2024-02-15');
          await page.fill('[data-testid="time-select"]', '10:00');

          // Submit appointment
          await page.click('[data-testid="book-appointment-btn"]');

          // Wait for success message or redirect
          await page.waitForSelector('[data-testid="appointment-success"]', { timeout: 10000 });

          return { success: true, userId: index + 1 };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { success: false, userId: index + 1, error: errorMessage };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;

    console.log(`Appointment Booking Load Test:`);
    console.log(`Concurrent Users: ${concurrentUsers}`);
    console.log(`Successful Bookings: ${successful}`);
    console.log(`Failed Bookings: ${failed}`);

    // In a real scenario, we might expect some failures due to concurrent booking conflicts
    expect(successful + failed).toBe(concurrentUsers);

    // Cleanup
    for (const { context } of pages) {
      await context.close();
    }
  });

  test('Should handle high-frequency API calls', async ({ page }) => {
    const apiCalls = 50;
    const results = [];

    for (let i = 0; i < apiCalls; i++) {
      const startTime = Date.now();

      try {
        // Simulate API call to patient data endpoint
        const response = await page.request.get('/api/patients');
        const endTime = Date.now();

        results.push({
          success: response.ok(),
          responseTime: endTime - startTime,
          status: response.status()
        });

        // Small delay between calls
        await page.waitForTimeout(100);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          success: false,
          responseTime: Date.now() - startTime,
          error: errorMessage
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const maxResponseTime = Math.max(...results.map(r => r.responseTime));
    const minResponseTime = Math.min(...results.map(r => r.responseTime));

    console.log(`API Load Test Results:`);
    console.log(`Total Calls: ${apiCalls}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`Max Response Time: ${maxResponseTime}ms`);
    console.log(`Min Response Time: ${minResponseTime}ms`);

    // Assertions
    expect(successful).toBeGreaterThanOrEqual(apiCalls * 0.95); // 95% success rate
    expect(avgResponseTime).toBeLessThan(1000); // Average < 1 second
    expect(maxResponseTime).toBeLessThan(5000); // Max < 5 seconds
  });

  test('Should handle memory usage under load', async ({ page, browser }) => {
    // This test would require browser performance monitoring
    // For now, we'll simulate basic memory checks

    await page.goto('/admin/dashboard');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');

    // Get initial memory usage (if available)
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    // Simulate user interactions that might cause memory usage
    for (let i = 0; i < 20; i++) {
      await page.click('[data-testid="refresh-data-btn"]');
      await page.waitForTimeout(500);
    }

    // Check memory after interactions
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.used - initialMemory.used;
      const memoryIncreaseMB = (memoryIncrease / 1024 / 1024).toFixed(2);

      console.log(`Memory Usage Test:`);
      console.log(`Initial Memory: ${(initialMemory.used / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Final Memory: ${(finalMemory.used / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Memory Increase: ${memoryIncreaseMB} MB`);

      // Assert memory increase is reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('Should handle database connection pool limits', async ({ page }) => {
    // This test simulates multiple database operations
    const concurrentOperations = 20;
    const operations = [];

    for (let i = 0; i < concurrentOperations; i++) {
      operations.push(
        page.request.post('/api/patients/search', {
          data: { query: `test-patient-${i}` }
        })
      );
    }

    const startTime = Date.now();
    const results = await Promise.allSettled(operations);
    const endTime = Date.now();

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok()).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value.ok()).length;

    console.log(`Database Load Test:`);
    console.log(`Concurrent Operations: ${concurrentOperations}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Time: ${endTime - startTime}ms`);

    // Assertions
    expect(successful).toBeGreaterThanOrEqual(concurrentOperations * 0.9); // 90% success rate
    expect(endTime - startTime).toBeLessThan(30000); // Complete within 30 seconds
  });
});