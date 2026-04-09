import { test as base, expect, Page } from '@playwright/test';

/**
 * Extended Playwright test with custom fixtures for CareSync HIMS E2E testing
 * Provides authentication, database access, and user context for role-based testing
 */

interface TestFixtures {
  authenticatedPage: Page;
  userRole: string;
  userContext: {
    user: {
      id: string;
      email: string;
      password: string;
      role: string;
      hospital_id: string;
      full_name: string;
    };
    hospital: {
      id: string;
      name: string;
    };
  };
}

export const test = base.extend<TestFixtures>({
  userRole: async ({}, use) => {
    // Default role, can be overridden in test.use()
    const role = process.env.TEST_USER_ROLE || 'patient';
    await use(role);
  },

  userContext: async ({ userRole }, use) => {
    // Mock user context - matches mock auth credentials in LoginPage.tsx
    const testUsers: Record<string, any> = {
      patient: {
        id: 'patient-001',
        email: 'patient@testgeneral.com',
        password: 'TestPass123!',
        role: 'patient',
        hospital_id: 'hp1',
        full_name: 'Test Patient',
      },
      doctor: {
        id: 'doctor-001',
        email: 'doctor@testgeneral.com',
        password: 'TestPass123!',
        role: 'doctor',
        hospital_id: 'hp1',
        full_name: 'Dr. Test Doctor',
      },
      pharmacy: {
        id: 'pharmacist-001',
        email: 'pharmacy@testgeneral.com',
        password: 'TestPass123!',
        role: 'pharmacy',
        hospital_id: 'hp1',
        full_name: 'Test Pharmacist',
      },
      laboratory: {
        id: 'lab-tech-001',
        email: 'lab@testgeneral.com',
        password: 'TestPass123!',
        role: 'laboratory',
        hospital_id: 'hp1',
        full_name: 'Test Lab Technician',
      },
      receptionist: {
        id: 'receptionist-001',
        email: 'reception@testgeneral.com',
        password: 'TestPass123!',
        role: 'receptionist',
        hospital_id: 'hp1',
        full_name: 'Test Receptionist',
      },
      admin: {
        id: 'admin-001',
        email: 'admin@testgeneral.com',
        password: 'TestPass123!',
        role: 'admin',
        hospital_id: 'hp1',
        full_name: 'Test Admin',
      },
    };

    const user = testUsers[userRole] || testUsers.patient;
    const hospital = {
      id: 'hp1',
      name: 'E2E Test Hospital',
    };

    await use({
      user,
      hospital,
    });
  },

  authenticatedPage: async ({ page, userContext }, use) => {
    // Navigate to login
    await page.goto('/login');

    // Find and fill login form based on role
    const loginForm = await page.$('form[data-testid="login-form"]');
    if (!loginForm) {
      throw new Error('Login form not found');
    }

    // Determine email input based on role
    const emailInputSelector =
      userContext.user.role === 'patient'
        ? 'input[name="mrn"]'
        : 'input[name="email"]';

    await page.fill(emailInputSelector, userContext.user.email);
    await page.fill('input[name="password"]', userContext.user.password);

    // Submit login
    const submitButton = await page.$(
      'button[type="submit"], button:has-text("Login")'
    );
    if (submitButton) {
      await submitButton.click();
    }

    // Wait for redirect based on role
    const roleRoutes: Record<string, string> = {
      patient: '/patient/dashboard',
      doctor: '/doctor/dashboard',
      pharmacy: '/pharmacy/queue',
      laboratory: '/lab/orders',
      receptionist: '/reception/patients',
      admin: '/admin/dashboard',
    };

    const expectedRoute = roleRoutes[userContext.user.role] || '/dashboard';
    await page.waitForURL('**' + expectedRoute, { timeout: 10000 });

    // Verify login successful
    const userGreeting = await page.locator('[data-testid="user-greeting"]');
    expect(userGreeting).toBeVisible();

    await use(page);
  },
});

export { expect };
