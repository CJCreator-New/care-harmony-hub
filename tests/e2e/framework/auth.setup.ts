import { test as setup, expect } from '@playwright/test';
import { ROLE_PROJECTS, getRoleCredentials, storageStatePath } from './roles';

for (const role of ROLE_PROJECTS) {
  setup(`authenticate ${role}`, async ({ page }) => {
    const creds = getRoleCredentials(role);
    setup.skip(!creds, `Missing credentials for ${role}. Set E2E_${role.toUpperCase()}_* env vars.`);

    await page.goto('/hospital/login');
    await page.getByLabel(/email/i).fill(creds!.email);
    await page.getByLabel(/password/i).fill(creds!.password);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    await expect(page).toHaveURL(/dashboard|hospital\/account-setup/i);
    await page.context().storageState({ path: storageStatePath(role) });
  });
}
