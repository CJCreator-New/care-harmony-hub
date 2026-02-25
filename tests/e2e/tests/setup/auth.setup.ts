/**
 * Phase 0 Setup — Pre-authenticate all 7 roles
 *
 * This setup project runs before the auth/permissions/workflows/security
 * phases. It logs in as each role and saves the storage state so that
 * subsequent tests can start already authenticated.
 *
 * Storage state files are written to test-results/.auth-full/<role>.json
 */

import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8080';
const AUTH_DIR = path.join('test-results', '.auth-full');

const ROLES = [
  { role: 'admin',          email: 'admin@testgeneral.com',       password: 'TestPass123!' },
  { role: 'doctor',         email: 'doctor@testgeneral.com',      password: 'TestPass123!' },
  { role: 'nurse',          email: 'nurse@testgeneral.com',       password: 'TestPass123!' },
  { role: 'receptionist',   email: 'reception@testgeneral.com',   password: 'TestPass123!' },
  { role: 'pharmacist',     email: 'pharmacy@testgeneral.com',    password: 'TestPass123!' },
  { role: 'lab_technician', email: 'lab@testgeneral.com',         password: 'TestPass123!' },
  { role: 'patient',        email: 'patient@testgeneral.com',     password: 'TestPass123!' },
] as const;

// Ensure directory exists
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

for (const roleConfig of ROLES) {
  setup(`authenticate as ${roleConfig.role}`, async ({ page, context }) => {
    await page.goto(`${BASE_URL}/hospital/login`);
    await page.waitForLoadState('domcontentloaded');

    await page.getByLabel(/email/i).first().fill(roleConfig.email);
    await page.getByLabel(/password/i).first().fill(roleConfig.password);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // Wait for navigation away from the login page
    await page.waitForURL(
      (url) => !url.pathname.includes('/hospital/login') && !url.pathname.includes('/login'),
      { timeout: 30_000 }
    );
    await page.waitForLoadState('networkidle');

    const authFile = path.join(AUTH_DIR, `${roleConfig.role}.json`);
    await context.storageState({ path: authFile });

    console.log(`  ✓ Auth state saved: ${roleConfig.role} → ${authFile}`);
  });
}
