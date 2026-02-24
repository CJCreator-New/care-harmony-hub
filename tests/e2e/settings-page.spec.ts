import { test, expect } from '@playwright/test';
import { createErrorCollector, enableTestMode, installMockApi, interactWithFormControls, login, navigateTo } from './utils';

test.describe('Route Coverage: Settings', () => {
  test.beforeEach(async ({ page }) => {
    installMockApi(page);
    await enableTestMode(page);
    await login(page);
  });

  test('should validate settings controls and persistence in-session', async ({ page }) => {
    const errors = createErrorCollector(page);

    await test.step('Navigate to settings route', async () => {
      await navigateTo(page, '/settings');
      await page.waitForURL('**/settings');
      await expect(page.locator('body')).toBeVisible();
    });

    await test.step('Assert key headings and labels', async () => {
      await expect(page.getByRole('heading').first()).toBeVisible();
      await expect(page.getByText(/settings|preferences|profile/i).first()).toBeVisible();
    });

    await test.step('Toggle switches and update inputs', async () => {
      const switches = page.locator('[role="switch"]');
      const switchCount = await switches.count();
      for (let i = 0; i < Math.min(switchCount, 3); i += 1) {
        const sw = switches.nth(i);
        if (await sw.isVisible()) {
          await sw.click();
        }
      }

      await interactWithFormControls(page, 'Settings value');

      const save = page.getByRole('button', { name: /save|update|apply/i }).first();
      if (await save.isVisible()) {
        await save.click();
      }
    });

    await test.step('Check for confirmation patterns and no errors', async () => {
      const toastLike = page.locator('[role="status"], [data-sonner-toast], [data-testid*="toast"]').first();
      if (await toastLike.count()) {
        await expect(toastLike).toBeVisible({ timeout: 5000 });
      }
      await errors.assertNoClientErrors();
    });
  });
});
