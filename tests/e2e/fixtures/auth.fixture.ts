/**
 * Authentication Fixture
 * Provides authenticated page contexts for each user role
 */

import { test as base, Page, BrowserContext } from '@playwright/test';
import { TEST_USERS, UserRole, TestUser } from '../config/test-users';
import { getEnvironmentConfig } from '../config/environments';

/**
 * Storage state file paths for each role
 */
const STORAGE_STATE_DIR = 'test-results/.auth';

function getStorageStatePath(role: UserRole): string {
  return `${STORAGE_STATE_DIR}/${role}.json`;
}

/**
 * Perform login and save storage state
 */
async function performLogin(page: Page, user: TestUser): Promise<void> {
  const config = getEnvironmentConfig();
  
  await page.goto(`${config.baseURL}/login`);
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  
  // Submit
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  
  // Wait for navigation to dashboard or home
  await page.waitForURL(/\/(dashboard|home|admin|doctor|nurse|reception|pharmacy|lab|patient)/i, {
    timeout: 30000,
  });
  
  // Additional wait for app to fully load
  await page.waitForLoadState('networkidle');
}

/**
 * Extended test fixture with authentication helpers
 */
interface AuthFixtures {
  authenticatedPage: Page;
  loginAs: (role: UserRole) => Promise<Page>;
  currentUser: TestUser | null;
}

/**
 * Create authentication test fixture
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Default to admin user
    await performLogin(page, TEST_USERS.admin);
    await use(page);
  },

  loginAs: async ({ browser }, use) => {
    const pages: Page[] = [];
    
    const loginAs = async (role: UserRole): Promise<Page> => {
      const user = TEST_USERS[role];
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await performLogin(page, user);
      pages.push(page);
      
      return page;
    };
    
    await use(loginAs);
    
    // Cleanup
    for (const page of pages) {
      await page.close();
    }
  },

  currentUser: null,
});

/**
 * Setup project for generating auth states
 */
export async function globalSetup(): Promise<void> {
  const { chromium } = await import('@playwright/test');
  const config = getEnvironmentConfig();
  
  const browser = await chromium.launch();
  
  // Generate storage state for each role
  for (const [role, user] of Object.entries(TEST_USERS)) {
    console.log(`Setting up auth state for: ${role}`);
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await performLogin(page, user);
      await context.storageState({ path: getStorageStatePath(role as UserRole) });
      console.log(`✓ Auth state saved for: ${role}`);
    } catch (error) {
      console.error(`✗ Failed to setup auth for ${role}:`, error);
    } finally {
      await context.close();
    }
  }
  
  await browser.close();
}

/**
 * Role-specific test helpers
 */
export const adminTest = test.extend<{ adminPage: Page }>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: getStorageStatePath('admin'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export const doctorTest = test.extend<{ doctorPage: Page }>({
  doctorPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: getStorageStatePath('doctor'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export const nurseTest = test.extend<{ nursePage: Page }>({
  nursePage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: getStorageStatePath('nurse'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export const receptionistTest = test.extend<{ receptionistPage: Page }>({
  receptionistPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: getStorageStatePath('receptionist'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export const pharmacistTest = test.extend<{ pharmacistPage: Page }>({
  pharmacistPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: getStorageStatePath('pharmacist'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export const labTechTest = test.extend<{ labTechPage: Page }>({
  labTechPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: getStorageStatePath('lab_tech'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export const patientTest = test.extend<{ patientPage: Page }>({
  patientPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: getStorageStatePath('patient'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
