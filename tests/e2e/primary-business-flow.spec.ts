import { test, expect } from '@playwright/test';
import { createErrorCollector, enableTestMode, installMockApi, login, navigateTo } from './utils';
import { mockPrimaryEntities } from './mockData';

test.describe('Flow: Primary Business Flow', () => {
  test.beforeEach(async ({ page }) => {
    installMockApi(page);
    await enableTestMode(page);
    await login(page);
  });

  test('creates a primary entity and verifies listing/detail', async ({ page }) => {
    const errors = createErrorCollector(page);
    const entity = mockPrimaryEntities[0];

    await test.step('Open create flow from dashboard', async () => {
      await navigateTo(page, '/dashboard');
      const createBtn = page.getByRole('button', { name: /new|create|add/i }).first();
      await expect(createBtn).toBeVisible();
      await createBtn.click();
    });

    await test.step('Fill primary entity form', async () => {
      await page.getByLabel(/name|title/i).first().fill(entity.name);
      await page.getByLabel(/description|details/i).first().fill(entity.description);

      const category = page.getByLabel(/category|type/i).first();
      if (await category.isVisible()) {
        await category.fill(entity.category);
      }

      const startDate = page.getByLabel(/date|start/i).first();
      if (await startDate.isVisible()) {
        await startDate.fill(entity.startDate);
      }
    });

    await test.step('Submit and verify success state', async () => {
      await page.getByRole('button', { name: /save|submit|create/i }).first().click();
      await expect(page.locator('[role="status"], [data-sonner-toast], [data-testid*="toast"]').first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('Verify entity appears in listing or detail', async () => {
      const entitiesNav = page.getByRole('link', { name: /entities|projects|records|list/i }).first();
      if (await entitiesNav.isVisible()) {
        await entitiesNav.click();
      }
      await expect(page.getByText(entity.name)).toBeVisible();
      await expect(page.getByText(entity.description)).toBeVisible();
    });

    await test.step('Assert no client errors', async () => {
      await errors.assertNoClientErrors();
    });
  });
});
