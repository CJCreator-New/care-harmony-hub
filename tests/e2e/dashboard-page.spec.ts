import { test, expect } from '@playwright/test';
import { createErrorCollector, enableTestMode, installMockApi, interactWithFormControls, login, navigateTo } from './utils';

test.describe('Route Coverage: Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    installMockApi(page);
    await enableTestMode(page);
    await login(page);
  });

  test('should verify major dashboard widgets and actions', async ({ page }) => {
    const errors = createErrorCollector(page);

    await test.step('Navigate to dashboard', async () => {
      await navigateTo(page, '/dashboard');
      await page.waitForURL('**/dashboard');
      await expect(page.locator('body')).toBeVisible();
    });

    await test.step('Assert major layout and key content', async () => {
      await expect(page.getByRole('heading').first()).toBeVisible();
      await expect(page.locator('[role="tab"], [data-testid*="tab"]').first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('table, [role="table"], [data-testid*="table"]').first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('Exercise tabs, accordions, cards, and buttons where available', async () => {
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      for (let i = 0; i < Math.min(tabCount, 3); i += 1) {
        const tab = tabs.nth(i);
        if (await tab.isVisible()) {
          await tab.click();
        }
      }

      const accordionTriggers = page.locator('[data-state][data-radix-collection-item], [aria-expanded]');
      const accordionCount = await accordionTriggers.count();
      for (let i = 0; i < Math.min(accordionCount, 2); i += 1) {
        const item = accordionTriggers.nth(i);
        if (await item.isVisible()) {
          await item.click();
        }
      }

      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();
      for (let i = 0; i < Math.min(buttonCount, 5); i += 1) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          await button.click();
        }
      }
    });

    await test.step('Interact with dashboard forms', async () => {
      await interactWithFormControls(page, 'Dashboard update');
    });

    await test.step('Validate no uncaught client errors', async () => {
      await errors.assertNoClientErrors();
    });
  });
});
