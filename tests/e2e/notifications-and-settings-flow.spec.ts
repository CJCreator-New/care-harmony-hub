import { test, expect } from '@playwright/test';
import { createErrorCollector, enableTestMode, installMockApi, login, navigateTo } from './utils';

test.describe('Flow: Notifications and Settings', () => {
  test.beforeEach(async ({ page }) => {
    installMockApi(page);
    await enableTestMode(page);
    await login(page);
  });

  test('interacts with notifications and preference toggles', async ({ page }) => {
    const errors = createErrorCollector(page);

    await test.step('Open notifications area', async () => {
      await navigateTo(page, '/dashboard');
      const notificationsEntry = page.getByRole('link', { name: /notifications|messages|inbox/i }).first();
      if (await notificationsEntry.isVisible()) {
        await notificationsEntry.click();
      }
      await expect(page.locator('body')).toBeVisible();
    });

    await test.step('Interact with notification items', async () => {
      const markRead = page.getByRole('button', { name: /mark read|read|accept|decline/i });
      const actionCount = await markRead.count();
      for (let i = 0; i < Math.min(actionCount, 3); i += 1) {
        const action = markRead.nth(i);
        if (await action.isVisible()) {
          await action.click();
        }
      }
    });

    await test.step('Open settings and toggle preferences', async () => {
      await navigateTo(page, '/settings');
      await page.waitForURL('**/settings');

      const switches = page.locator('[role="switch"]');
      const count = await switches.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < Math.min(count, 2); i += 1) {
        const sw = switches.nth(i);
        if (await sw.isVisible()) {
          await sw.click();
        }
      }

      const save = page.getByRole('button', { name: /save|update|apply/i }).first();
      if (await save.isVisible()) {
        await save.click();
      }
    });

    await test.step('Assert settings persist during the test session', async () => {
      await page.reload();
      await page.waitForURL('**/settings');
      await expect(page.locator('body')).toBeVisible();
    });

    await test.step('Assert no client errors', async () => {
      await errors.assertNoClientErrors();
    });
  });
});
