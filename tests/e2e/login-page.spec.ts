import { test, expect } from '@playwright/test';
import { createErrorCollector, enableTestMode, installMockApi, navigateTo } from './utils';
import { mockUsers } from './mockData';

test.describe('Route Coverage: Login', () => {
  test.beforeEach(async ({ page }) => {
    installMockApi(page);
    await enableTestMode(page);
  });

  test('should validate login UI and interactions', async ({ page }) => {
    const errors = createErrorCollector(page);

    await test.step('Navigate to login route', async () => {
      await navigateTo(page, '/login');
      await expect(page.locator('body')).toBeVisible();
    });

    await test.step('Assert key login content', async () => {
      await expect(page.getByRole('heading').first()).toBeVisible();
      await expect(page.getByRole('textbox').first()).toBeVisible();
      await expect(page.getByRole('button').first()).toBeVisible();
    });

    await test.step('Submit invalid and valid credentials', async () => {
      const email = page.getByLabel(/email/i).or(page.getByRole('textbox').first());
      const password = page.getByLabel(/password/i).or(page.getByRole('textbox').nth(1));

      await email.fill('invalid-email');
      await password.fill('short');

      const submit = page.getByRole('button', { name: /sign in|login|continue/i }).first();
      if (await submit.isVisible()) {
        await submit.click();
      }

      await email.fill(mockUsers.standard.email);
      await password.fill(mockUsers.standard.password);
      if (await submit.isVisible()) {
        await submit.click();
      }
    });

    await test.step('Assert UI remains stable', async () => {
      await expect(page.locator('body')).toBeVisible();
      await errors.assertNoClientErrors();
    });
  });
});
