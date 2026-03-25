/**
 * Role-Based Fixtures (Enhanced)
 * Pre-authenticated sessions and fixtures for each clinical role.
 * Per hims-browser-test-automation skill.
 * 
 * Usage:
 *   test('doctor creates prescription', async ({ doctorPage, pharmacistPage }) => {
 *     // doctorPage is pre-authenticated as doctor
 *     // pharmacistPage is pre-authenticated as pharmacist
 *   });
 */

import { test as base, Page, BrowserContext } from '@playwright/test';
import path from 'path';

interface RoleFixtures {
  doctorPage: Page;
  nursePage: Page;
  pharmacistPage: Page;
  receptionistPage: Page;
  labTechPage: Page;
  patientPage: Page;
  adminPage: Page;
}

// Define the auth storage files for each role
const ROLE_AUTH_FILES: Record<string, string> = {
  doctor: '.auth/doctor.json',
  nurse: '.auth/nurse.json',
  pharmacist: '.auth/pharmacist.json',
  receptionist: '.auth/receptionist.json',
  labtech: '.auth/labtech.json',
  patient: '.auth/patient.json',
  admin: '.auth/admin.json',
};

/**
 * Create authenticated page for a specific role.
 * Loads pre-saved authentication state.
 */
async function getAuthenticatedPage(
  browser: any,
  role: keyof RoleFixtures,
  baseURL: string
): Promise<Page> {
  const authFilePath = path.resolve(ROLE_AUTH_FILES[role]);
  
  let storageState: any;
  try {
    storageState = require(authFilePath);
  } catch (e) {
    // If auth file doesn't exist, this role hasn't been set up yet
    console.warn(`Auth file not found for ${role}: ${authFilePath}`);
    storageState = undefined;
  }

  const context = await browser.newContext({
    storageState: storageState,
    baseURL,
  });

  return context.newPage();
}

/**
 * Extend base test with role-authenticated pages.
 */
export const test = base.extend<RoleFixtures>({
  doctorPage: async ({ browser }, use) => {
    const page = await getAuthenticatedPage(browser, 'doctorPage', process.env.BASE_URL || 'http://localhost:8080');
    await use(page);
    await page.close();
  },

  nursePage: async ({ browser }, use) => {
    const page = await getAuthenticatedPage(browser, 'nursePage', process.env.BASE_URL || 'http://localhost:8080');
    await use(page);
    await page.close();
  },

  pharmacistPage: async ({ browser }, use) => {
    const page = await getAuthenticatedPage(browser, 'pharmacistPage', process.env.BASE_URL || 'http://localhost:8080');
    await use(page);
    await page.close();
  },

  receptionistPage: async ({ browser }, use) => {
    const page = await getAuthenticatedPage(browser, 'receptionistPage', process.env.BASE_URL || 'http://localhost:8080');
    await use(page);
    await page.close();
  },

  labTechPage: async ({ browser }, use) => {
    const page = await getAuthenticatedPage(browser, 'labTechPage', process.env.BASE_URL || 'http://localhost:8080');
    await use(page);
    await page.close();
  },

  patientPage: async ({ browser }, use) => {
    const page = await getAuthenticatedPage(browser, 'patientPage', process.env.BASE_URL || 'http://localhost:8080');
    await use(page);
    await page.close();
  },

  adminPage: async ({ browser }, use) => {
    const page = await getAuthenticatedPage(browser, 'adminPage', process.env.BASE_URL || 'http://localhost:8080');
    await use(page);
    await page.close();
  },
});

export { expect } from '@playwright/test';
