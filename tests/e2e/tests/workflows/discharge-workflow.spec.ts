import { test, expect, type Page, type Route } from '@playwright/test';

const HOSPITAL_ID = '00000000-0000-0000-0000-000000000001';

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function bootstrapRoleSession(page: Page, email: string, role: 'pharmacist' | 'receptionist') {
  await page.goto('/hospital/login');
  await page.getByRole('textbox').first().fill(email);
  await page.locator('input[type="password"]').first().fill('TestPass123!');
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/dashboard|hospital\/account-setup/i, { timeout: 15000 });
  await page.evaluate((nextRole) => {
    window.localStorage.setItem('preferredRole', nextRole);
    window.localStorage.setItem('testRole', nextRole);
  }, role);
}

async function mockDischargeWorkflowApi(
  page: Page,
  role: 'pharmacist' | 'billing',
  rejectionReasonLog: { value?: string },
) {
  let workflows = [
    {
      id: 'workflow-1',
      hospital_id: HOSPITAL_ID,
      patient_id: 'patient-11111111',
      consultation_id: 'consult-11111111',
      initiated_by: 'doctor-1',
      current_step: role,
      status: 'in_progress',
      last_action_by: 'doctor-1',
      last_action_at: '2026-03-11T09:00:00.000Z',
      rejection_reason: null,
      metadata: {},
      created_at: '2026-03-11T08:50:00.000Z',
      updated_at: '2026-03-11T09:10:00.000Z',
    },
  ];

  const profileRecord = {
    id: 'profile-1',
    user_id: role === 'pharmacist' ? 'pharmacy-user-1' : 'billing-user-1',
    hospital_id: HOSPITAL_ID,
    first_name: role === 'pharmacist' ? 'Pharmacy' : 'Billing',
    last_name: 'User',
    email: role === 'pharmacist' ? 'pharmacy@testgeneral.com' : 'reception@testgeneral.com',
    phone: null,
    avatar_url: null,
    two_factor_enabled: false,
  };

  const hospitalRecord = {
    id: HOSPITAL_ID,
    name: 'Test General Hospital',
    address: '123 Test Street',
    city: 'Test City',
    state: 'TS',
    zip: '12345',
    phone: '(555) 123-4567',
    email: 'admin@testgeneral.com',
    license_number: 'LIC-E2E-001',
  };

  page.route('**/rest/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname.endsWith('/profiles') && method === 'GET') {
      return json(route, profileRecord);
    }

    if (pathname.endsWith('/hospitals') && method === 'GET') {
      return json(route, hospitalRecord);
    }

    if (pathname.endsWith('/user_roles') && method === 'GET') {
      return json(route, [{ role: role === 'pharmacist' ? 'pharmacist' : 'receptionist' }]);
    }

    if (pathname.endsWith('/discharge_workflows') && method === 'GET') {
      const currentStep = url.searchParams.get('current_step')?.replace('eq.', '');
      const filtered = currentStep ? workflows.filter((workflow) => workflow.current_step === currentStep) : workflows;
      return json(route, filtered);
    }

    if (pathname.endsWith('/discharge_workflow_audit') && method === 'GET') {
      return json(route, []);
    }

    return json(route, []);
  });

  page.route('**/functions/v1/discharge-workflow', async (route) => {
    const body = route.request().postDataJSON() as { action: string; reason?: string };

    if (body.action === 'approve') {
      workflows = [];
      return json(route, { success: true, workflow: { id: 'workflow-1', current_step: 'billing' } });
    }

    if (body.action === 'reject') {
      rejectionReasonLog.value = body.reason;
      workflows = [];
      return json(route, { success: true, workflow: { id: 'workflow-1', current_step: 'pharmacist' } });
    }

    return json(route, { success: true });
  });
}

test.describe('Discharge workflow UI', () => {
  test('pharmacist approval path clears the pharmacy queue entry', async ({ page }) => {
    const rejectionReasonLog: { value?: string } = {};
    await mockDischargeWorkflowApi(page, 'pharmacist', rejectionReasonLog);
    await bootstrapRoleSession(page, 'pharmacy@testgeneral.com', 'pharmacist');

    await page.goto('/workflow/discharge');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Discharge Workflow' })).toBeVisible();
    await expect(page.getByText('Pharmacy Clearance Queue')).toBeVisible();
    await expect(page.getByText('Patient patient-', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: 'Approve Medication Reconciliation' }).click();

    await expect(page.getByText('No discharge workflows are waiting on pharmacy.')).toBeVisible();
  });

  test('billing rejection path requires a reason and returns the item upstream', async ({ page }) => {
    const rejectionReasonLog: { value?: string } = {};
    await mockDischargeWorkflowApi(page, 'billing', rejectionReasonLog);
    await bootstrapRoleSession(page, 'reception@testgeneral.com', 'receptionist');

    await page.goto('/workflow/discharge');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Billing Finalization Queue')).toBeVisible();
    await page.getByLabel('Reject with reason').fill('Invoice mismatch');
    await page.getByRole('button', { name: 'Reject' }).click();

    await expect(page.getByText('No discharge workflows are waiting on billing.')).toBeVisible();
    expect(rejectionReasonLog.value).toBe('Invoice mismatch');
  });
});
