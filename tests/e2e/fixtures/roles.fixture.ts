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
import fs from 'fs';

interface RoleFixtures {
  doctorPage: Page;
  nursePage: Page;
  pharmacistPage: Page;
  receptionistPage: Page;
  labTechPage: Page;
  patientPage: Page;
  adminPage: Page;
}

// Map fixture keys to role names
const FIXTURE_TO_ROLE: Record<string, string> = {
  doctorPage: 'doctor',
  nursePage: 'nurse',
  pharmacistPage: 'pharmacist',
  receptionistPage: 'receptionist',
  labTechPage: 'labtech',
  patientPage: 'patient',
  adminPage: 'admin',
};

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
 * Generate mock auth session for testing
 * This allows tests to run without real Supabase credentials
 */
function generateMockAuthSession(role: string): any {
  const now = new Date();
  const roleMap: Record<string, { email: string; firstName: string; lastName: string }> = {
    doctor: { email: 'doctor@testgeneral.com', firstName: 'Doctor', lastName: 'User' },
    nurse: { email: 'nurse@testgeneral.com', firstName: 'Nurse', lastName: 'User' },
    pharmacist: { email: 'pharmacist@testgeneral.com', firstName: 'Pharmacy', lastName: 'User' },
    receptionist: { email: 'receptionist@testgeneral.com', firstName: 'Reception', lastName: 'User' },
    labtech: { email: 'labtech@testgeneral.com', firstName: 'Lab', lastName: 'User' },
    patient: { email: 'patient@testgeneral.com', firstName: 'Patient', lastName: 'User' },
    admin: { email: 'admin@testgeneral.com', firstName: 'Admin', lastName: 'User' },
  };

  const roleInfo = roleMap[role] || roleMap.user;
  const userId = `00000000-0000-0000-0000-00000000001${role.charCodeAt(0) % 10}`;
  
  return {
    access_token: `mock_jwt_${role}_${Date.now()}`,
    refresh_token: `mock_refresh_${role}`,
    expires_at: now.getTime() + 3600000,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: roleInfo.email,
      email_confirmed_at: now.toISOString(),
      phone: '',
      confirmed_at: now.toISOString(),
      last_sign_in_at: now.toISOString(),
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        role: role,
      },
      user_metadata: {
        hospital_id: '00000000-0000-0000-0000-000000000001',
        role: role,
        first_name: roleInfo.firstName,
        last_name: roleInfo.lastName,
      },
      identities: [],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      is_super_admin: false,
    },
  };
}

/**
 * Create authenticated page for a specific role.
 * Loads pre-saved authentication state or generates mock auth.
 */
async function getAuthenticatedPage(
  browser: any,
  fixtureKey: string,
  baseURL: string
): Promise<Page> {
  // Extract role name from fixture key
  const role = FIXTURE_TO_ROLE[fixtureKey] || fixtureKey.replace('Page', '').toLowerCase();
  const authFileRelPath = ROLE_AUTH_FILES[role];
  
  if (!authFileRelPath) {
    console.warn(`No auth file mapping found for role: ${role} (fixture: ${fixtureKey})`);
  }
  
  const authFilePath = path.resolve(process.cwd(), authFileRelPath);
  
  let storageState: any = undefined;
  try {
    if (fs.existsSync(authFilePath)) {
      const fileContent = fs.readFileSync(authFilePath, 'utf-8');
      storageState = JSON.parse(fileContent);
      console.log(`✓ Using pre-authenticated session for ${role}`);
    }
  } catch (e) {
    console.warn(`Failed to load auth file for ${role}: ${authFilePath}`);
  }

  const context = await browser.newContext({
    storageState: storageState || undefined,
    baseURL,
  });

  const page = await context.newPage();

  // If no stored auth, inject mock auth directly into localStorage
  if (!storageState) {
    const mockSession = generateMockAuthSession(role);
    
    // Navigate to app base first
    await page.goto(baseURL + '/');
    
    // Inject mock auth into localStorage (Supabase/AuthContext compatible)
    await page.evaluate(({ session, role_name }: { session: any; role_name: string }) => {
      // Enable E2E mock auth mode
      window.localStorage.setItem('VITE_E2E_MOCK_AUTH', 'true');
      
      // Store the mock user for AuthContext detection
      const e2eMockUser = {
        id: session.user.id,
        firstName: session.user.user_metadata.first_name,
        lastName: session.user.user_metadata.last_name,
        role: role_name,
        hospitalId: session.user.user_metadata.hospital_id,
      };
      window.localStorage.setItem('e2e-mock-auth-user', JSON.stringify(e2eMockUser));
      
      // Store session in Supabase format
      const sessionKey = `sb-${session.user.id}-auth-token`;
      window.localStorage.setItem(sessionKey, JSON.stringify(session));
      window.localStorage.setItem('sb-auth-session-key', sessionKey);
      
      // Mark test auth for identification
      window.localStorage.setItem('__test_auth_role', role_name);
      (window as any).__testAuthRole = role_name;
    }, { session: mockSession, role_name: role });
    
    console.log(`✓ Injected mock auth session for ${role}`);
    
    // Reload page so auth takes effect
    await page.reload();
    await page.waitForLoadState('networkidle');
  }

  return page;
}

/**
 * Extend base test with role-authenticated pages.
 */
export const test = base.extend<RoleFixtures>({
  doctorPage: async ({ browser }, use) => {
    const page = await getAuthenticatedPage(browser, 'doctorPage', 'http://localhost:8080');
    await use(page);
    await page.close();
  },

  nursePage: async ({ browser }, use) => {
    const page = await getAuthenticatedPage(browser, 'nursePage', 'http://localhost:8080');
    await use(page);
    await page.close();
  },

  pharmacistPage: async ({ browser }, use) => {
    const page = await getAuthenticatedPage(browser, 'pharmacistPage', 'http://localhost:8080');
    await use(page);
    await page.close();
  },

  receptionistPage: async ({ browser }, use) => {
    const page = await getAuthenticatedPage(browser, 'receptionistPage', 'http://localhost:8080');
    await use(page);
    await page.close();
  },

  labTechPage: async ({ browser }, use) => {
    const page = await getAuthenticatedPage(browser, 'labTechPage', 'http://localhost:8080');
    await use(page);
    await page.close();
  },

  patientPage: async ({ browser }, use) => {
    const page = await getAuthenticatedPage(browser, 'patientPage', 'http://localhost:8080');
    await use(page);
    await page.close();
  },

  adminPage: async ({ browser }, use) => {
    const page = await getAuthenticatedPage(browser, 'adminPage', 'http://localhost:8080');
    await use(page);
    await page.close();
  },
});

export { expect } from '@playwright/test';
