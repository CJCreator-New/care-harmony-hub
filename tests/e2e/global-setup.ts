/**
 * Global Setup for Playwright Tests
 * 
 * Runs once before all test files to prepare authentication state
 * and other prerequisites for the test suite.
 */

import { chromium, FullConfig } from '@playwright/test';
import { TEST_USERS, UserRole } from './config/test-users';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '.auth');

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Ensure auth directory exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  // Pre-authenticate key roles and save storage state
  const rolesToSetup: UserRole[] = ['admin', 'doctor', 'nurse', 'receptionist'];

  for (const role of rolesToSetup) {
    const user = TEST_USERS[role];
    const authFile = path.join(AUTH_DIR, `${role}.json`);

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Navigate to login
      await page.goto(`${baseURL}/hospital/login`);

      // Perform login
      await page.fill('#email', user.email);
      await page.fill('#password', user.password);
      await page.click('button[type="submit"]');

      // Wait for successful navigation
      await page.waitForURL('**/dashboard**', { timeout: 30000 });

      // Save storage state
      await context.storageState({ path: authFile });

      console.log(`✅ Auth state saved for ${role}: ${authFile}`);

      await context.close();
    } catch (error) {
      console.warn(`⚠️ Could not pre-auth ${role}: ${error}`);
      // Continue with other roles
    }
  }

  await browser.close();

  // Create environment info file
  const envInfo = {
    baseURL,
    timestamp: new Date().toISOString(),
    roles: rolesToSetup,
  };

  fs.writeFileSync(
    path.join(AUTH_DIR, 'env-info.json'),
    JSON.stringify(envInfo, null, 2)
  );

  console.log('🚀 Global setup complete');
}

export default globalSetup;
