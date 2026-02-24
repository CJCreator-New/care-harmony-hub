import { test, expect } from '@playwright/test';
import { createErrorCollector, enableTestMode, installMockApi, navigateTo } from './utils';
import { mockUsers } from './mockData';

test.describe('Flow: Auth and Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    installMockApi(page);
    await enableTestMode(page);
  });

  test('completes login and lands in authenticated area', async ({ page }) => {
    const errors = createErrorCollector(page);

    await test.step('Visit entry page', async () => {
      await navigateTo(page, '/');
      await expect(page.locator('body')).toBeVisible();
    });

    await test.step('Open auth page', async () => {
      const authLink = page.getByRole('link', { name: /login|sign in|get started/i }).first();
      if (await authLink.isVisible()) {
        await authLink.click();
      } else {
        await navigateTo(page, '/login');
      }
      await page.waitForURL(/\/login|\/signin|\/auth/);
    });

    await test.step('Fill registration or login form', async () => {
      const email = page.getByLabel(/email/i).or(page.getByRole('textbox').first());
      const password = page.getByLabel(/password/i).or(page.getByRole('textbox').nth(1));
      await email.fill(mockUsers.standard.email);
      await password.fill(mockUsers.standard.password);

      const nameField = page.getByLabel(/name|full name/i);
      if (await nameField.count()) {
        await nameField.first().fill(mockUsers.standard.name);
      }
    });

    await test.step('Submit and wait for dashboard', async () => {
      await page.getByRole('button', { name: /sign in|login|create account|register|continue/i }).first().click();
      await page.waitForURL(/\/dashboard|\/app|\/home/, { timeout: 15_000 });
      await expect(page.locator('body')).toBeVisible();
    });

    await test.step('Verify authenticated state', async () => {
      await expect(page.getByRole('navigation').first()).toBeVisible();
      await errors.assertNoClientErrors();
    });
  });
});
