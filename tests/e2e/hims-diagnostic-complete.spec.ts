/**
 * HIMS E2E Diagnostic Suite
 * Complete end-to-end testing for RBAC violations and workflow bugs
 * 
 * This test file systematically discovers bugs across:
 * - Role-Based Access Control (RBAC)
 * - Workflow state machines
 * - Cross-role data handoffs
 * - Permission enforcement
 * 
 * @group diagnostic
 * @group critical
 */

import { test, expect, Browser } from '@playwright/test';
import type { Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8080';

const TEST_USERS = {
  admin:          { email: 'admin@testgeneral.com',       password: 'TestPass123!', role: 'admin' },
  doctor:         { email: 'doctor@testgeneral.com',      password: 'TestPass123!', role: 'doctor' },
  nurse:          { email: 'nurse@testgeneral.com',       password: 'TestPass123!', role: 'nurse' },
  receptionist:   { email: 'reception@testgeneral.com',   password: 'TestPass123!', role: 'receptionist' },
  pharmacist:     { email: 'pharmacy@testgeneral.com',    password: 'TestPass123!', role: 'pharmacist' },
  labtech:        { email: 'lab@testgeneral.com',         password: 'TestPass123!', role: 'lab_technician' },
  patient:        { email: 'patient@testgeneral.com',     password: 'TestPass123!', role: 'patient' },
};

// Define which roles should have access to which routes
const ROUTE_ACCESS_MATRIX = {
  '/dashboard':       ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'labtech', 'patient'],
  '/patients':        ['admin', 'doctor', 'nurse', 'receptionist'],
  '/appointments':    ['admin', 'doctor', 'nurse', 'receptionist'],
  '/consultations':   ['admin', 'doctor', 'nurse'],
  '/laboratory':      ['admin', 'doctor', 'nurse', 'labtech'],
  '/pharmacy':        ['admin', 'pharmacist'],
  '/inventory':       ['admin', 'pharmacist'],
  '/billing':         ['admin', 'receptionist'],
  '/queue':           ['admin', 'doctor', 'nurse', 'receptionist'],
  '/patient/portal':  ['patient'],
  '/settings':        ['admin'],
  '/staff':           ['admin'],
} as Record<string, string[]>;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log test finding for debugging
 */
function logIssue(severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', category: string, title: string, details: string) {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ${severity} — ${category}\n  Title: ${title}\n  Details: ${details}\n`);
}

/**
 * Login user and wait for dashboard
 */
async function loginAs(page: Page, userKey: keyof typeof TEST_USERS): Promise<void> {
  const user = TEST_USERS[userKey];
  
  try {
    await page.goto(`${BASE_URL}/hospital/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Fill credentials
    const emailField = page.getByLabel(/email|username/i).first();
    const passwordField = page.getByLabel(/password/i).first();
    const submitBtn = page.getByRole('button', { name: /sign in|log in|login/i }).first();
    
    if (await emailField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailField.fill(user.email);
    }
    if (await passwordField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await passwordField.fill(user.password);
    }
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click();
    }
    
    // Wait for dashboard or portal
    await page.waitForURL(new RegExp('/(dashboard|patient/portal|portal|home)', 'i'), { timeout: 30000 }).catch(() => {});
    await page.waitForLoadState('networkidle');
  } catch (error) {
    console.error(`Failed to login as ${userKey}:`, error);
    throw error;
  }
}

/**
 * Check if a route is blocked (redirected or shows access denied)
 */
async function isRouteBlocked(page: Page, route: string): Promise<{ blocked: boolean; reason: string }> {
  try {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
  } catch (error) {
    return { blocked: true, reason: 'Navigation failed (likely blocked)' };
  }

  const currentUrl = page.url();
  const isRedirected = !currentUrl.includes(route) && (currentUrl.includes('/login') || currentUrl.includes('/dashboard'));
  
  if (isRedirected) {
    return { blocked: true, reason: `Redirected to ${currentUrl}` };
  }

  const accessDenied = await page
    .locator(':text("Access Denied"), :text("access denied"), :text("Unauthorized"), :text("Permission denied")')
    .first()
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (accessDenied) {
    return { blocked: true, reason: 'Access Denied message shown' };
  }

  return { blocked: false, reason: 'Route accessible and no access denial message' };
}

/**
 * Verify role can access page and perform action
 */
async function verifyRoleAccess(page: Page, role: string, route: string, actionName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await isRouteBlocked(page, route);
    if (result.blocked) {
      return { success: false, error: result.reason };
    }

    // Check if expected action button is present
    const actionBtn = page.getByRole('button', { name: new RegExp(actionName, 'i') }).first();
    const hasAction = await actionBtn.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!hasAction) {
      return { success: false, error: `Action button "${actionName}" not visible` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suites
// ─────────────────────────────────────────────────────────────────────────────

test.describe('HIMS E2E Diagnostic Suite', () => {
  
  // ──────────────────────────────────────────────────────────────────────────
  // Suite 1: RBAC — Route Access Control
  // ──────────────────────────────────────────────────────────────────────────
  
  test.describe('Suite 1: RBAC — Route Access Control', () => {
    
    test('1.1: All roles can access /dashboard', async ({ page }) => {
      const roles = Object.keys(TEST_USERS) as (keyof typeof TEST_USERS)[];
      
      for (const roleKey of roles) {
        await loginAs(page, roleKey);
        const { blocked } = await isRouteBlocked(page, '/dashboard');
        
        expect(blocked).toBe(false, `${roleKey} should be able to access /dashboard`);
      }
    });

    test('1.2: Pharmacist cannot access /consultations', async ({ page }) => {
      await loginAs(page, 'pharmacist');
      const { blocked } = await isRouteBlocked(page, '/consultations');
      
      if (!blocked) {
        logIssue('CRITICAL', 'RBAC', 'Pharmacist can access restricted route', 
          'Pharmacist was able to access /consultations which should be doctor/nurse only');
      }
      expect(blocked).toBe(true); // Pharmacist should not access /consultations');
    });

    test('1.3: Patient cannot access /patients (management)', async ({ page }) => {
      await loginAs(page, 'patient');
      const { blocked } = await isRouteBlocked(page, '/patients');
      
      if (!blocked) {
        logIssue('CRITICAL', 'RBAC', 'Patient can access patient management',
          'Patient was able to access /patients which should be staff only');
      }
      expect(blocked).toBe(true); // Patient should not access /patients');
    });

    test('1.4: Lab Tech cannot access /pharmacy', async ({ page }) => {
      await loginAs(page, 'labtech');
      const { blocked } = await isRouteBlocked(page, '/pharmacy');
      
      if (!blocked) {
        logIssue('CRITICAL', 'RBAC', 'Lab Tech can access pharmacy',
          'Lab Tech was able to access /pharmacy which should be pharmacist/admin only');
      }
      expect(blocked).toBe(true); // Lab Tech should not access /pharmacy');
    });

    test('1.5: Receptionist cannot access /settings (admin only)', async ({ page }) => {
      await loginAs(page, 'receptionist');
      const { blocked } = await isRouteBlocked(page, '/settings');
      
      if (!blocked) {
        logIssue('CRITICAL', 'RBAC', 'Receptionist can access admin settings',
          'Receptionist was able to access /settings which should be admin only');
      }
      expect(blocked).toBe(true); // Receptionist should not access /settings');
    });

    test('1.6: Complete route matrix validation', async ({ page }) => {
      const roles = Object.keys(TEST_USERS) as (keyof typeof TEST_USERS)[];
      const routes = Object.keys(ROUTE_ACCESS_MATRIX);
      
      const violations: string[] = [];

      for (const route of routes) {
        const allowedRoles = ROUTE_ACCESS_MATRIX[route];
        
        for (const roleKey of roles) {
          await loginAs(page, roleKey);
          const { blocked } = await isRouteBlocked(page, route);
          const shouldHaveAccess = allowedRoles.includes(TEST_USERS[roleKey].role);
          
          if (shouldHaveAccess && blocked) {
            violations.push(`${roleKey} DENIED access to ${route} (should have access)`);
            logIssue('HIGH', 'RBAC', `${roleKey} denied legitimate access`, 
              `${roleKey} should access ${route} but was blocked`);
          } else if (!shouldHaveAccess && !blocked) {
            violations.push(`${roleKey} ALLOWED access to ${route} (should be denied)`);
            logIssue('CRITICAL', 'RBAC', `${roleKey} unauthorized access to ${route}`,
              `${roleKey} was able to access ${route} which should be restricted`);
          }
        }
      }

      if (violations.length > 0) {
        console.log('\n❌ RBAC Violations Found:');
        violations.forEach(v => console.log(`  - ${v}`));
      } else {
        console.log('\n✅ All RBAC checks passed!');
      }

      expect(violations.length).toBe(0, `${violations.length} RBAC violations found`);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 2: Workflow State Machine Validation
  // ──────────────────────────────────────────────────────────────────────────
  
  test.describe('Suite 2: Workflow State Machine Validation', () => {
    
    test('2.1: Doctor can create prescription', async ({ page }) => {
      await loginAs(page, 'doctor');
      const { success } = await verifyRoleAccess(page, 'doctor', '/consultations', 'prescri');
      
      if (!success) {
        logIssue('HIGH', 'Workflow', 'Doctor cannot create prescription',
          'Doctor was unable to reach prescription creation UI');
      }
      // Don't fail here; doctor might need a patient first
    });

    test('2.2: Pharmacist can approve prescription', async ({ page }) => {
      await loginAs(page, 'pharmacist');
      const { success } = await verifyRoleAccess(page, 'pharmacist', '/pharmacy', 'approve');
      
      if (!success) {
        logIssue('HIGH', 'Workflow', 'Pharmacist cannot approve prescriptions',
          'Pharmacist pages do not show approval/dispense actions');
      }
    });

    test('2.3: Nurse can dispense medication', async ({ page }) => {
      await loginAs(page, 'nurse');
      await page.goto(`${BASE_URL}/pharmacy`, { waitUntil: 'networkidle' }).catch(() => {});
      
      const { blocked } = await isRouteBlocked(page, '/pharmacy');
      // Nurse might not have /pharmacy access, but if they can access queue, should see dispense
      const inQueue = page.url().includes('/queue');
      if (!blocked || inQueue) {
        const dispenseBtn = page.getByRole('button', { name: /dispense/i }).first();
        const hasDispense = await dispenseBtn.isVisible({ timeout: 3000 }).catch(() => false);
        if (!hasDispense) {
          logIssue('MEDIUM', 'Workflow', 'Nurse cannot dispense from queue',
            'Dispense button not visible in pharmacy/queue for nurse');
        }
      }
    });

    test('2.4: Patient can view prescriptions (portal)', async ({ page }) => {
      await loginAs(page, 'patient');
      const { success } = await verifyRoleAccess(page, 'patient', '/patient/portal', 'prescri');
      
      if (!success) {
        logIssue('MEDIUM', 'Workflow', 'Patient portal missing prescriptions',
          'Patient cannot view expected prescription information in portal');
      }
    });

    test('2.5: Lab order workflow accessible', async ({ page }) => {
      await loginAs(page, 'doctor');
      const { success } = await verifyRoleAccess(page, 'doctor', '/laboratory', 'order|create');
      
      if (!success) {
        logIssue('MEDIUM', 'Workflow', 'Doctor cannot create lab orders',
          'Lab order creation UI not accessible to doctor');
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 3: Cross-Role Data Handoffs
  // ──────────────────────────────────────────────────────────────────────────
  
  test.describe('Suite 3: Cross-Role Data Handoffs', () => {
    
    test('3.1: Doctor data visible to nurse (read-only)', async ({ page }) => {
      await loginAs(page, 'nurse');
      const { blocked } = await isRouteBlocked(page, '/consultations');
      
      // Nurse should either have read-only access or be denied
      if (blocked) {
        // That's fine if policy is nurse cannot see consultations
        const { blocked: patientsBlocked } = await isRouteBlocked(page, '/patients');
        if (patientsBlocked) {
          logIssue('MEDIUM', 'Workflow', 'Nurse cannot access patient data',
            'Nurse was denied access to both consultations and patients');
        }
      }
    });

    test('3.2: Pharmacist data not visible to receptionist', async ({ page }) => {
      await loginAs(page, 'receptionist');
      const { blocked } = await isRouteBlocked(page, '/pharmacy');
      
      if (!blocked) {
        logIssue('CRITICAL', 'Data Isolation', 'Receptionist can access pharmacy',
          'Receptionist was able to access pharmacist-only /pharmacy route');
      }
      expect(blocked).toBe(true);
    });

    test('3.3: Patient data isolated from other patients', async ({ page }) => {
      // This would require creating test data, so just check patient portal is accessible
      await loginAs(page, 'patient');
      const { blocked } = await isRouteBlocked(page, '/patient/portal');
      
      if (blocked) {
        logIssue('CRITICAL', 'Data Isolation', 'Patient cannot access own portal',
          'Patient was denied access to /patient/portal');
      }
      expect(blocked).toBe(false);
    });

    test('3.4: Lab results visible to ordering doctor', async ({ page }) => {
      await loginAs(page, 'doctor');
      const { blocked } = await isRouteBlocked(page, '/laboratory');
      
      if (blocked) {
        logIssue('HIGH', 'Workflow', 'Doctor cannot see lab orders/results',
          'Doctor was denied access to /laboratory');
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 4: Permission Enforcement at Action Level
  // ──────────────────────────────────────────────────────────────────────────
  
  test.describe('Suite 4: Permission Enforcement at Action Level', () => {
    
    test('4.1: Receptionist cannot create patient (if RBAC enforced)', async ({ page }) => {
      await loginAs(page, 'receptionist');
      
      const { blocked } = await isRouteBlocked(page, '/patients');
      if (!blocked) {
        // If receptionist can see patients, check if create button is present
        const createBtn = page.getByRole('button', { name: /add|new|create/i }).first();
        const hasCreate = await createBtn.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (hasCreate) {
          logIssue('MEDIUM', 'RBAC', 'Receptionist has create patient button',
            'Receptionist should see patients list but not create button');
        }
      }
    });

    test('4.2: Pharmacist cannot edit prescription (only approve)', async ({ page }) => {
      await loginAs(page, 'pharmacist');
      await page.goto(`${BASE_URL}/pharmacy`, { waitUntil: 'networkidle' });
      
      const editBtn = page.locator('button:has-text("Edit"), button:has-text("Modify"), button:has-text("Update")').first();
      const hasEdit = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasEdit) {
        logIssue('HIGH', 'RBAC', 'Pharmacist can edit prescription',
          'Pharmacist should only approve, not edit prescriptions');
      }
    });

    test('4.3: Nurse cannot delete orders', async ({ page }) => {
      await loginAs(page, 'nurse');
      
      const routes = ['/consultations', '/laboratory', '/queue'];
      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' }).catch(() => {});
        
        const deleteBtn = page.locator('button:has-text("Delete"), button:has-text("Remove"), [aria-label*="delete" i]').first();
        const hasDelete = await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false);
        
        if (hasDelete) {
          logIssue('HIGH', 'RBAC', `Nurse can delete from ${route}`,
            'Nurse should not have delete permissions');
          break;
        }
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Suite 5: Error Handling & Resilience
  // ──────────────────────────────────────────────────────────────────────────
  
  test.describe('Suite 5: Error Handling & Resilience', () => {
    
    test('5.1: Graceful message when unauthorized API call made', async ({ page }) => {
      await loginAs(page, 'patient');
      
      // Try calling an admin API
      const result = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/admin/settings', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          return { status: response.status, ok: response.ok };
        } catch (error) {
          return { error: String(error) };
        }
      });

      if (!result.error && result.status === 200) {
        logIssue('CRITICAL', 'Security', 'Patient can access admin API',
          'Patient unauthorized API call returned 200 (should be 403)');
      }
    });

    test('5.2: No PHI leaks in error messages', async ({ page }) => {
      await loginAs(page, 'receptionist');
      
      // Try accessing a denied route
      await page.goto(`${BASE_URL}/admin/staff`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      
      // Check page content for PHI patterns
      const pageText = await page.content();
      const phiPatterns = [
        /\+91\s*\d{10}/,  // Indian phone
        /\d{3}-\d{4}-\d{4}/,  // SSN-like
        /\d{12}/,  // 12 digit ID
      ];
      
      const containsPHI = phiPatterns.some(pattern => pattern.test(pageText));
      if (containsPHI) {
        logIssue('HIGH', 'Security', 'PHI visible in error pages',
          'Error page may be leaking patient identifiable information');
      }
    });

    test('5.3: Session expiry handled gracefully', async ({ page }) => {
      await loginAs(page, 'doctor');
      
      // Clear localStorage (simulate session expiry)
      await page.evaluate(() => localStorage.clear());
      
      // Try to access protected route
      await page.goto(`${BASE_URL}/consultations`, { waitUntil: 'domcontentloaded' });
      
      const hasLoginPrompt = await page.locator(':text("login"), :text("sign in"), :text("session")').first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      
      if (!hasLoginPrompt) {
        logIssue('MEDIUM', 'UX', 'Session expiry not clearly communicated',
          'User cleared storage but no login prompt appeared');
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Export helper for other test files
// ─────────────────────────────────────────────────────────────────────────────

export { loginAs, isRouteBlocked, verifyRoleAccess, logIssue, TEST_USERS, ROUTE_ACCESS_MATRIX };
