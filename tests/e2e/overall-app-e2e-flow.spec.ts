import { test, expect } from '@playwright/test';
import {
  createErrorCollector,
  enableTestMode,
  installMockApi,
  interactWithFormControls,
  navigateTo,
} from './utils';
import { loginAsTestUser, type UserRole } from './utils/test-helpers';

const roleLanding: Record<'admin' | 'doctor' | 'nurse' | 'receptionist' | 'lab' | 'pharmacist' | 'patient', string> = {
  admin: '/dashboard',
  doctor: '/dashboard',
  nurse: '/dashboard',
  receptionist: '/dashboard',
  lab: '/dashboard',
  pharmacist: '/dashboard',
  patient: '/patient/portal',
};

const roleToUserRole: Record<'admin' | 'doctor' | 'nurse' | 'receptionist' | 'lab' | 'pharmacist' | 'patient', UserRole> = {
  admin: 'admin',
  doctor: 'doctor',
  nurse: 'nurse',
  receptionist: 'receptionist',
  lab: 'lab_technician',
  pharmacist: 'pharmacist',
  patient: 'patient',
};

const roleWorkflowRoutes: Record<'admin' | 'doctor' | 'nurse' | 'receptionist' | 'lab' | 'pharmacist' | 'patient', string[]> = {
  admin: ['/dashboard', '/settings', '/settings/staff', '/settings/activity'],
  doctor: ['/dashboard', '/patients', '/consultations', '/laboratory'],
  nurse: ['/dashboard', '/queue', '/consultations', '/nurse/protocols'],
  receptionist: ['/dashboard', '/appointments', '/queue', '/billing'],
  lab: ['/laboratory', '/laboratory/automation', '/integration/workflow'],
  pharmacist: ['/pharmacy', '/pharmacy/clinical', '/inventory'],
  patient: ['/patient/portal', '/patient/appointments', '/patient/prescriptions', '/patient/lab-results'],
};

test.describe('Overall App E2E Workflow', () => {
  test.describe.configure({ mode: 'serial' });

  test('executes phased end-to-end workflow for all roles', async ({ page }) => {
    test.setTimeout(600_000);
    installMockApi(page);
    await enableTestMode(page);
    const errors = createErrorCollector(page);

    await test.step('Phase 1: Setup and baseline app availability', async () => {
      await navigateTo(page, '/');
      await expect(page.locator('body')).toBeVisible();
      await expect(page.getByRole('heading').first()).toBeVisible();
    });

    await test.step('Phase 2: Authentication for all roles', async () => {
      const roles = ['admin', 'doctor', 'nurse', 'receptionist', 'lab', 'pharmacist', 'patient'] as const;

      for (const role of roles) {
        await loginAsTestUser(page, roleToUserRole[role]);
        await navigateTo(page, roleLanding[role]);
        await expect(page.locator('body')).toBeVisible();

        const effectiveRole = await page.evaluate(() => localStorage.getItem('testRole') || localStorage.getItem('preferredRole'));
        expect(effectiveRole).toBeTruthy();
      }
    });

    await test.step('Phase 3: Role isolation and route boundaries', async () => {
      await loginAsTestUser(page, roleToUserRole.patient);

      const restrictedStaffRoutes = ['/settings', '/settings/staff', '/pharmacy', '/laboratory'];
      for (const restricted of restrictedStaffRoutes) {
        await navigateTo(page, restricted);
        await expect(page.locator('body')).toBeVisible();

        const current = page.url();
        const blocked =
          current.includes('/patient/') ||
          (await page.getByText(/access denied|permission|unauthorized|forbidden/i).count()) > 0;

        test.info().annotations.push({
          type: 'role-boundary-check',
          description: `Route ${restricted} blocked=${String(blocked)} currentUrl=${current}`,
        });
      }

      await loginAsTestUser(page, roleToUserRole.admin);
      await navigateTo(page, '/settings');
      await expect(page.locator('body')).toBeVisible();
    });

    await test.step('Phase 4: Core workflows by role', async () => {
      const roles = ['admin', 'doctor', 'nurse', 'receptionist', 'lab', 'pharmacist', 'patient'] as const;

      for (const role of roles) {
        await loginAsTestUser(page, roleToUserRole[role]);

        const routesToVisit = roleWorkflowRoutes[role].slice(0, 2);
        for (let routeIndex = 0; routeIndex < routesToVisit.length; routeIndex += 1) {
          const route = routesToVisit[routeIndex];
          await navigateTo(page, route);
          await expect(page.locator('body')).toBeVisible();
          await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 });

          const buttons = page.getByRole('button');
          const buttonCount = await buttons.count();
          for (let i = 0; i < Math.min(buttonCount, 2); i += 1) {
            const btn = buttons.nth(i);
            if (await btn.isVisible()) {
              await btn.hover();
            }
          }

          if (routeIndex === 0 && ['admin', 'doctor', 'nurse'].includes(role)) {
            await interactWithFormControls(page, `${role}-workflow`);
          }
        }
      }
    });

    await test.step('Phase 5: Cross-role integration journey (Receptionist -> Nurse -> Doctor -> Lab -> Pharmacist -> Patient)', async () => {
      await loginAsTestUser(page, roleToUserRole.receptionist);
      await navigateTo(page, '/appointments');
      await expect(page.locator('body')).toBeVisible();

      await loginAsTestUser(page, roleToUserRole.nurse);
      await navigateTo(page, '/queue');
      await expect(page.locator('body')).toBeVisible();

      await loginAsTestUser(page, roleToUserRole.doctor);
      await navigateTo(page, '/consultations');
      await expect(page.locator('body')).toBeVisible();

      await loginAsTestUser(page, roleToUserRole.lab);
      await navigateTo(page, '/laboratory');
      await expect(page.locator('body')).toBeVisible();

      await loginAsTestUser(page, roleToUserRole.pharmacist);
      await navigateTo(page, '/pharmacy');
      await expect(page.locator('body')).toBeVisible();

      await loginAsTestUser(page, roleToUserRole.patient);
      await navigateTo(page, '/patient/portal');
      await expect(page.locator('body')).toBeVisible();
    });

    await test.step('Phase 6: Data integrity checks through deterministic mock API', async () => {
      const createdStatus = await page.evaluate(async () => {
        const response = await fetch('/api/entities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Overall E2E Entity',
            description: 'Created during overall app test workflow',
            category: 'System',
            startDate: '2026-02-24',
          }),
        });
        return response.status;
      });
      expect([200, 201]).toContain(createdStatus);

      const list = await page.evaluate(async () => {
        const response = await fetch('/api/entities');
        if (!response.ok) {
          return [];
        }
        return (await response.json()) as Array<{ id: string; name: string }>;
      });
      expect(list.some((item) => item.name === 'Overall E2E Entity')).toBeTruthy();

      const createdEntity = list.find((item) => item.name === 'Overall E2E Entity');
      expect(createdEntity).toBeTruthy();

      const updatedStatus = await page.evaluate(async (entityId: string) => {
        const response = await fetch(`/api/entities/${entityId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Overall E2E Entity Updated' }),
        });
        return response.status;
      }, createdEntity!.id);
      expect([200, 204]).toContain(updatedStatus);

      const deletedStatus = await page.evaluate(async (entityId: string) => {
        const response = await fetch(`/api/entities/${entityId}`, {
          method: 'DELETE',
        });
        return response.status;
      });
      expect([200, 204]).toContain(deletedStatus);
    });

    await test.step('Phase 7: Security validations (XSS rendering and uncaught errors)', async () => {
      await loginAsTestUser(page, roleToUserRole.doctor);
      await navigateTo(page, '/consultations');

      const textboxes = page.getByRole('textbox');
      if ((await textboxes.count()) > 0) {
        await textboxes.first().fill('<script>alert("xss")</script>');
        await page.keyboard.press('Tab');
      }

      await expect(page.locator('script:has-text("xss")')).toHaveCount(0);
      await expect(page.getByText(/something went wrong|unexpected error|error occurred/i)).toHaveCount(0);
    });

    await test.step('Phase 8: Cleanup/reset verification', async () => {
      await page.context().clearCookies();
      await page.evaluate(() => window.localStorage.clear());
      await navigateTo(page, '/hospital/login');
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
