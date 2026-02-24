import { test, expect } from '@playwright/test';
import { createErrorCollector, enableTestMode, installMockApi, loginAsRole, navigateTo } from './utils';

type RoleScenario = {
  roleName: string;
  loginRole: 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'lab' | 'pharmacist' | 'patient';
  routes: string[];
};

const scenarios: RoleScenario[] = [
  { roleName: 'Admin', loginRole: 'admin', routes: ['/dashboard', '/settings', '/settings/staff', '/reports'] },
  { roleName: 'Doctor', loginRole: 'doctor', routes: ['/dashboard', '/consultations', '/appointments', '/messages'] },
  { roleName: 'Nurse', loginRole: 'nurse', routes: ['/dashboard', '/queue', '/consultations', '/nurse/protocols'] },
  { roleName: 'Receptionist', loginRole: 'receptionist', routes: ['/dashboard', '/appointments', '/billing', '/receptionist/smart-scheduler'] },
  { roleName: 'Lab', loginRole: 'lab', routes: ['/dashboard', '/laboratory', '/laboratory/automation', '/integration/workflow'] },
  { roleName: 'Pharmacist', loginRole: 'pharmacist', routes: ['/dashboard', '/pharmacy', '/pharmacy/clinical', '/inventory'] },
  { roleName: 'Patient Portal', loginRole: 'patient', routes: ['/patient/portal', '/patient/appointments', '/patient/prescriptions', '/patient/lab-results'] },
];

test.describe('Role-Based E2E Setup Coverage', () => {
  for (const scenario of scenarios) {
    test(`${scenario.roleName}: same deterministic setup and key routes`, async ({ page }) => {
      installMockApi(page);
      await enableTestMode(page);
      const errors = createErrorCollector(page);

      await test.step(`Authenticate as ${scenario.roleName}`, async () => {
        await loginAsRole(page, scenario.loginRole);
        await expect(page.locator('body')).toBeVisible();
      });

      for (const route of scenario.routes) {
        await test.step(`${scenario.roleName}: navigate to ${route}`, async () => {
          await navigateTo(page, route);
          await expect(page.locator('body')).toBeVisible();

          await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 });

          const nav = page.getByRole('navigation').first();
          if (await nav.count()) {
            await expect(nav).toBeVisible();
          }

          const buttons = page.getByRole('button');
          const buttonCount = await buttons.count();
          for (let i = 0; i < Math.min(buttonCount, 3); i += 1) {
            const button = buttons.nth(i);
            if (await button.isVisible()) {
              await button.hover();
            }
          }
        });
      }

      await test.step(`Verify ${scenario.roleName} route pass has no uncaught client errors`, async () => {
        await errors.assertNoClientErrors();
      });
    });
  }
});
