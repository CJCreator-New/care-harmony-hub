import { test, expect } from '@playwright/test';

type AccessCase = {
  route: string;
  allow: Array<'admin' | 'doctor' | 'nurse' | 'receptionist' | 'viewer'>;
};

const MATRIX: AccessCase[] = [
  { route: '/settings/staff', allow: ['admin'] },
  { route: '/consultations', allow: ['admin', 'doctor', 'nurse'] },
  { route: '/queue', allow: ['admin', 'nurse', 'receptionist'] },
  { route: '/dashboard', allow: ['admin', 'doctor', 'nurse', 'receptionist', 'viewer'] },
];

const roleFromProject = (projectName: string) =>
  ['admin', 'doctor', 'nurse', 'receptionist', 'viewer'].includes(projectName)
    ? (projectName as 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'viewer')
    : null;

test.describe('Role Access Control Matrix', () => {
  for (const item of MATRIX) {
    test(`should enforce access for ${item.route}`, async ({ page }, testInfo) => {
      const role = roleFromProject(testInfo.project.name);
      test.skip(!role, 'Run with playwright.roles.config.ts role projects');

      await page.goto(item.route);

      if (item.allow.includes(role!)) {
        await expect(page).toHaveURL(new RegExp(item.route.replace('/', '\\/')));
      } else {
        await expect(page).toHaveURL(/access|denied|unauthorized|dashboard/i);
      }
    });
  }
});
