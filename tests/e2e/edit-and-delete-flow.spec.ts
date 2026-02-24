import { test, expect } from '@playwright/test';
import { createErrorCollector, enableTestMode, installMockApi, login, navigateTo } from './utils';
import { mockPrimaryEntities } from './mockData';

test.describe('Flow: Edit and Delete', () => {
  test.beforeEach(async ({ page }) => {
    installMockApi(page);
    await enableTestMode(page);
    await login(page);
  });

  test('edits an existing entity and optionally deletes it', async ({ page }) => {
    const errors = createErrorCollector(page);
    const existing = mockPrimaryEntities[0];
    const updatedName = `${existing.name} Updated`;

    await test.step('Open entity listing', async () => {
      await navigateTo(page, '/dashboard');
      const entitiesNav = page.getByRole('link', { name: /entities|projects|records|list/i }).first();
      if (await entitiesNav.isVisible()) {
        await entitiesNav.click();
      }
      await expect(page.getByText(existing.name).first()).toBeVisible();
    });

    await test.step('Open edit form and update fields', async () => {
      const editButton = page.getByRole('button', { name: /edit|manage|update/i }).first();
      await expect(editButton).toBeVisible();
      await editButton.click();

      await page.getByLabel(/name|title/i).first().fill(updatedName);
      await page.getByLabel(/description|details/i).first().fill('Updated details for deterministic flow validation.');
      await page.getByRole('button', { name: /save|update/i }).first().click();
    });

    await test.step('Verify updated entity data appears', async () => {
      await expect(page.getByText(updatedName).first()).toBeVisible();
    });

    await test.step('Run delete or archive flow if present', async () => {
      const deleteButton = page.getByRole('button', { name: /delete|archive|remove/i }).first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        const confirm = page.getByRole('button', { name: /confirm|yes|delete|archive/i }).first();
        if (await confirm.isVisible()) {
          await confirm.click();
        }

        await expect(page.getByText(updatedName)).toHaveCount(0);
      }
    });

    await test.step('Assert no client errors', async () => {
      await errors.assertNoClientErrors();
    });
  });
});
