import { expect } from '@playwright/test';
import { adminTest } from './fixtures/auth.fixture';

adminTest.describe('Admin — Dashboard & User Management', () => {
  adminTest('loads admin dashboard with stats', async ({ adminPage: page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);

    await expect(page.getByText(/patients|appointments|revenue/i).first()).toBeVisible();
  });

  adminTest('views staff list', async ({ adminPage: page }) => {
    await page.goto('/admin/staff');
    await expect(page).toHaveURL(/staff/);

    await expect(page.getByRole('table').or(page.getByTestId('staff-list'))).toBeVisible();
  });

  adminTest('invites a new staff member', async ({ adminPage: page }) => {
    await page.goto('/admin/staff');

    await page.getByRole('button', { name: /invite|add staff/i }).click();

    await page.getByLabel(/email/i).fill('newstaff@hospital.com');
    await page.getByLabel(/role/i).selectOption('nurse');

    await page.getByRole('button', { name: /send invite|invite/i }).click();

    await expect(page.getByText(/invitation sent|invited successfully/i)).toBeVisible();
  });

  adminTest('views audit logs', async ({ adminPage: page }) => {
    await page.goto('/admin/audit');
    await expect(page).toHaveURL(/audit/);

    await expect(page.getByRole('table').or(page.getByText(/activity|audit/i))).toBeVisible();
  });
});
