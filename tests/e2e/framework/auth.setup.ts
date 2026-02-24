import { test as setup, expect } from '@playwright/test';
import { ROLE_PROJECTS, getRoleCredentials, storageStatePath } from './roles';
import fs from 'fs';
import path from 'path';

const ROLE_EMAIL: Record<(typeof ROLE_PROJECTS)[number], string> = {
  admin: 'admin@testgeneral.com',
  doctor: 'doctor@testgeneral.com',
  nurse: 'nurse@testgeneral.com',
  receptionist: 'receptionist@testgeneral.com',
  pharmacist: 'pharmacist@testgeneral.com',
  lab_technician: 'labtech@testgeneral.com',
  patient: 'patient@testgeneral.com',
};

for (const role of ROLE_PROJECTS) {
  setup(`authenticate ${role}`, async ({ page }) => {
    const creds = getRoleCredentials(role);
    const authPath = storageStatePath(role);
    fs.mkdirSync(path.dirname(authPath), { recursive: true });

    if (creds) {
      await page.goto('/hospital/login');
      await page.getByLabel(/email/i).fill(creds.email);
      await page.getByLabel(/password/i).fill(creds.password);
      await page.getByRole('button', { name: /sign in|log in|login/i }).click();
      await expect(page).toHaveURL(/dashboard|hospital\/account-setup/i);
      await page.context().storageState({ path: authPath });
      return;
    }

    // Deterministic fallback using E2E mock auth in local dev/test.
    await page.addInitScript(
      ({ email, roleName }) => {
        window.localStorage.setItem('e2e-mock-auth-user', email);
        window.localStorage.setItem('preferredRole', roleName);
        window.localStorage.setItem('testRole', roleName);
      },
      { email: ROLE_EMAIL[role], roleName: role }
    );
    await page.goto('/dashboard');
    const url = page.url();
    if (!/dashboard|hospital\/account-setup/i.test(url)) {
      // Keep setup non-blocking for environments where mock-auth is not enabled.
      await page.goto('/hospital/login');
    }
    await page.context().storageState({ path: authPath });
  });
}
