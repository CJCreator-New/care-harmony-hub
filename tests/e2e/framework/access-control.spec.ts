import { test, expect, type Page } from '@playwright/test';
import type { UserRole } from './roles';

type AccessCase = {
  route: string;
  allow: UserRole[];
};

const MATRIX: AccessCase[] = [
  { route: '/settings/staff', allow: ['admin'] },
  { route: '/consultations', allow: ['admin', 'doctor', 'nurse'] },
  { route: '/queue', allow: ['admin', 'doctor', 'nurse', 'receptionist'] },
  { route: '/pharmacy', allow: ['admin', 'pharmacist'] },
  { route: '/laboratory', allow: ['admin', 'doctor', 'nurse', 'lab_technician'] },
  { route: '/inventory', allow: ['admin', 'pharmacist'] },
  { route: '/billing', allow: ['admin', 'receptionist'] },
  { route: '/nurse/protocols', allow: ['admin', 'nurse'] },
  { route: '/patient/portal', allow: ['patient'] },
  { route: '/dashboard', allow: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'] },
];

const ALL_ROLES: UserRole[] = ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'];
const roleFromProject = (projectName: string): UserRole | null =>
  ALL_ROLES.includes(projectName as UserRole) ? (projectName as UserRole) : null;

const ROLE_EMAIL: Record<UserRole, string> = {
  admin: 'admin@testgeneral.com',
  doctor: 'doctor@testgeneral.com',
  nurse: 'nurse@testgeneral.com',
  receptionist: 'receptionist@testgeneral.com',
  pharmacist: 'pharmacist@testgeneral.com',
  lab_technician: 'labtech@testgeneral.com',
  patient: 'patient@testgeneral.com',
};

async function bootstrapRoleAuth(page: Page, role: UserRole) {
  await page.addInitScript(
    ({ email, roleName }) => {
      window.localStorage.setItem('e2e-mock-auth-user', email);
      window.localStorage.setItem('preferredRole', roleName);
      window.localStorage.setItem('testRole', roleName);
    },
    { email: ROLE_EMAIL[role], roleName: role }
  );
}

test.describe('Role Access Control Matrix', () => {
  for (const item of MATRIX) {
    test(`should enforce access for ${item.route}`, async ({ page }, testInfo) => {
      const role = roleFromProject(testInfo.project.name);
      test.skip(!role, 'Run with playwright.roles.config.ts role projects');

      await bootstrapRoleAuth(page, role!);
      await page.goto('/dashboard');
      test.skip(page.url().includes('/hospital/login'), 'Mock auth is not enabled for current web server.');
      await page.goto(item.route);

      if (item.allow.includes(role!)) {
        await expect(page).toHaveURL(new RegExp(item.route.replace('/', '\\/')));
      } else {
        await expect(page.getByText(/access denied/i)).toBeVisible();
      }
    });
  }
});
