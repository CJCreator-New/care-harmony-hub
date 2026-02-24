import { test, expect } from '@playwright/test';
import { createErrorCollector, enableTestMode, installMockApi, interactWithFormControls, navigateTo } from './utils';

test.describe('Route Coverage: Home', () => {
  test.beforeEach(async ({ page }) => {
    installMockApi(page);
    await enableTestMode(page);
  });

  test('should enumerate and interact with key home elements', async ({ page }) => {
    const errors = createErrorCollector(page);

    await test.step('Navigate to home route', async () => {
      await navigateTo(page, '/');
      await expect(page.locator('body')).toBeVisible();
    });

    await test.step('Assert headings, labels, and navigation items', async () => {
      await expect(page.getByRole('heading').first()).toBeVisible();
      await expect(page.getByRole('navigation').first()).toBeVisible();
      await expect(page.locator('main, [role="main"]').first()).toBeVisible();
    });

    await test.step('Interact with visible buttons and links', async () => {
      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);

      for (let i = 0; i < Math.min(buttonCount, 5); i += 1) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          await button.click();
        }
      }

      const links = page.getByRole('link');
      const linkCount = await links.count();
      for (let i = 0; i < Math.min(linkCount, 3); i += 1) {
        const link = links.nth(i);
        if (await link.isVisible()) {
          await link.hover();
        }
      }
    });

    await test.step('Interact with forms and controls if present', async () => {
      await interactWithFormControls(page, 'Home page test value');
    });

    await test.step('Verify no unexpected client-side errors', async () => {
      await errors.assertNoClientErrors();
    });
  });
});
