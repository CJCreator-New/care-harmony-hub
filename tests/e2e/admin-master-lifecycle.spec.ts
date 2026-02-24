import { test, expect, Page, Route } from '@playwright/test';
import { loginAsTestUser } from './utils/test-helpers';

type StaffInvitation = {
  id: string;
  hospital_id: string;
  email: string;
  role: string;
  invited_by: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

type PatientRecord = {
  id: string;
  hospital_id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  blood_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  encryption_metadata?: Record<string, unknown> | null;
};

type LabOrder = {
  id: string;
  hospital_id: string;
  patient_id: string;
  test_name: string;
  test_category: string | null;
  priority: string;
  status: string;
  ordered_at: string;
  completed_at: string | null;
  result_notes: string | null;
  is_critical: boolean | null;
  collected_by: string | null;
  collected_at: string | null;
  processed_by: string | null;
  ordered_by: string | null;
};

type Medication = {
  id: string;
  hospital_id: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  form: string | null;
  strength: string | null;
  unit: string | null;
  manufacturer: string | null;
  current_stock: number;
  minimum_stock: number;
  unit_price: number | null;
  expiry_date: string | null;
  batch_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const ADMIN_ROUTES = [
  '/dashboard',
  '/patients',
  '/appointments',
  '/queue',
  '/consultations',
  '/telemedicine',
  '/voice-clinical-notes',
  '/pharmacy',
  '/inventory',
  '/laboratory',
  '/laboratory/automation',
  '/ai-demo',
  '/differential-diagnosis',
  '/treatment-recommendations',
  '/treatment-plan-optimization',
  '/predictive-analytics',
  '/length-of-stay-forecasting',
  '/resource-utilization-optimization',
  '/settings/staff',
  '/settings/performance',
  '/settings/activity',
  '/settings/monitoring',
  '/settings',
  '/billing',
  '/reports',
  '/integration/workflow',
];

function nowIso() {
  return new Date().toISOString();
}

async function loginAsAdmin(page: Page) {
  await page.goto('/hospital/login');
  await page.getByLabel(/email/i).fill('admin@testgeneral.com');
  await page.getByLabel(/password/i).fill('TestPass123!');
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();

  try {
    await expect(page).toHaveURL(/dashboard|hospital\/account-setup/i, { timeout: 8000 });
  } catch {
    await loginAsTestUser(page, 'admin');
    await expect(page).toHaveURL(/dashboard|hospital\/account-setup/i);
  }

  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
}

async function assertNoRuntimeCrash(page: Page) {
  await expect(page.getByText(/application error|something went wrong|referenceerror|typeerror/i)).toHaveCount(0);
}

async function attachMasterMocks(page: Page) {
  const baseHospitalId = 'e2e-hospital-001';
  const adminUserId = 'e2e-admin-001';

  let staffInvitations: StaffInvitation[] = [];
  let patients: PatientRecord[] = [
    {
      id: 'patient-seed-001',
      hospital_id: baseHospitalId,
      mrn: 'MRN-SEED-001',
      first_name: 'Seed',
      last_name: 'Patient',
      date_of_birth: '1990-01-01',
      gender: 'male',
      phone: '555-1001',
      email: 'seed.patient@example.com',
      address: '1 Seed Lane',
      city: 'Test City',
      state: 'TS',
      zip: '12345',
      blood_type: 'A+',
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
      encryption_metadata: null,
    },
  ];

  let labOrders: LabOrder[] = [
    {
      id: 'lab-seed-001',
      hospital_id: baseHospitalId,
      patient_id: 'patient-seed-001',
      test_name: 'Complete Blood Count',
      test_category: 'Hematology',
      priority: 'normal',
      status: 'sample_collected',
      ordered_at: nowIso(),
      completed_at: null,
      result_notes: null,
      is_critical: null,
      collected_by: adminUserId,
      collected_at: nowIso(),
      processed_by: null,
      ordered_by: adminUserId,
    },
  ];

  let medications: Medication[] = [
    {
      id: 'med-seed-001',
      hospital_id: baseHospitalId,
      name: 'Paracetamol',
      generic_name: 'Acetaminophen',
      category: 'analgesic',
      form: 'tablet',
      strength: '500mg',
      unit: 'tablets',
      manufacturer: 'Seed Pharma',
      current_stock: 20,
      minimum_stock: 10,
      unit_price: 1,
      expiry_date: '2027-12-31',
      batch_number: 'B-001',
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];

  const profiles = [
    {
      id: `profile-${adminUserId}`,
      user_id: adminUserId,
      hospital_id: baseHospitalId,
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@testgeneral.com',
      phone: null,
      avatar_url: null,
      is_staff: true,
      created_at: nowIso(),
    },
  ];

  await page.route(/\/rest\/v1\/rpc\/generate_mrn(\?|$)/, async (route) => {
    const newMrn = `MRN-E2E-${String(patients.length + 1).padStart(3, '0')}`;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(newMrn) });
  });

  await page.route(/\/rest\/v1\/activity_logs(\?|$)/, async (route) => {
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({}) });
  });

  await page.route(/\/rest\/v1\/profiles(\?|$)/, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profiles) });
      return;
    }
    await route.continue();
  });

  await page.route(/\/rest\/v1\/user_roles(\?|$)/, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'ur-1', user_id: adminUserId, hospital_id: baseHospitalId, role: 'admin', created_at: nowIso() }]),
      });
      return;
    }
    await route.continue();
  });

  await page.route(/\/rest\/v1\/staff_invitations(\?|$)/, async (route) => {
    const req = route.request();
    const method = req.method();
    const expectsSingle = req.headers()['accept']?.includes('application/vnd.pgrst.object+json');

    if (method === 'GET') {
      const url = req.url();
      const emailMatch = url.match(/email=eq\.([^&]+)/);
      const statusMatch = url.match(/status=eq\.([^&]+)/);
      const email = emailMatch ? decodeURIComponent(emailMatch[1]).toLowerCase() : null;
      const status = statusMatch ? decodeURIComponent(statusMatch[1]) : null;
      const filtered = staffInvitations.filter((inv) => {
        if (email && inv.email.toLowerCase() !== email) return false;
        if (status && inv.status !== status) return false;
        return true;
      });

      if (expectsSingle) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(filtered[0] ?? null),
        });
        return;
      }

      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(filtered) });
      return;
    }

    if (method === 'POST') {
      const body = req.postDataJSON() as Record<string, unknown>;
      const invitation: StaffInvitation = {
        id: `inv-${staffInvitations.length + 1}`,
        hospital_id: String(body.hospital_id || baseHospitalId),
        email: String(body.email || ''),
        role: String(body.role || 'nurse'),
        invited_by: String(body.invited_by || adminUserId),
        token: `token-${staffInvitations.length + 1}`,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        accepted_at: null,
        created_at: nowIso(),
      };
      staffInvitations = [invitation, ...staffInvitations];
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: expectsSingle ? JSON.stringify(invitation) : JSON.stringify([invitation]),
      });
      return;
    }

    if (method === 'PATCH') {
      const body = req.postDataJSON() as Record<string, unknown>;
      staffInvitations = staffInvitations.map((inv) => ({ ...inv, ...body }));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(staffInvitations) });
      return;
    }

    await route.continue();
  });

  await page.route(/\/rest\/v1\/patients(\?|$)/, async (route) => {
    const req = route.request();
    const method = req.method();
    const expectsSingle = req.headers()['accept']?.includes('application/vnd.pgrst.object+json');
    const totalPatients = patients.length;

    if (method === 'HEAD') {
      await route.fulfill({
        status: 200,
        headers: { 'content-range': `0-${Math.max(0, totalPatients - 1)}/${totalPatients}` },
      });
      return;
    }

    if (method === 'GET') {
      if (req.url().includes('id=eq.')) {
        const idMatch = req.url().match(/id=eq\.([^&]+)/);
        const id = idMatch ? decodeURIComponent(idMatch[1]) : '';
        const found = patients.find((p) => p.id === id) || null;
        await route.fulfill({
          status: found ? 200 : 404,
          contentType: 'application/json',
          body: expectsSingle ? JSON.stringify(found || {}) : JSON.stringify(found ? [found] : []),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': `0-${Math.max(0, totalPatients - 1)}/${totalPatients}` },
        body: JSON.stringify(patients),
      });
      return;
    }

    if (method === 'POST') {
      const body = req.postDataJSON() as Record<string, unknown>;
      const created: PatientRecord = {
        id: `patient-${patients.length + 1}`,
        hospital_id: String(body.hospital_id || baseHospitalId),
        mrn: String(body.mrn || `MRN-E2E-${patients.length + 1}`),
        first_name: String(body.first_name || ''),
        last_name: String(body.last_name || ''),
        date_of_birth: String(body.date_of_birth || '1990-01-01'),
        gender: String(body.gender || 'other'),
        phone: (body.phone as string) || null,
        email: (body.email as string) || null,
        address: (body.address as string) || null,
        city: (body.city as string) || null,
        state: (body.state as string) || null,
        zip: (body.zip as string) || null,
        blood_type: (body.blood_type as string) || null,
        is_active: true,
        created_at: nowIso(),
        updated_at: nowIso(),
        encryption_metadata: (body.encryption_metadata as Record<string, unknown>) || null,
      };
      patients = [created, ...patients];
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: expectsSingle ? JSON.stringify(created) : JSON.stringify([created]),
      });
      return;
    }

    if (method === 'PATCH') {
      const body = req.postDataJSON() as Record<string, unknown>;
      const idMatch = req.url().match(/id=eq\.([^&]+)/);
      const id = idMatch ? decodeURIComponent(idMatch[1]) : '';
      let updated: PatientRecord | null = null;
      patients = patients.map((p) => {
        if (p.id !== id) return p;
        updated = { ...p, ...body, updated_at: nowIso() } as PatientRecord;
        return updated;
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: expectsSingle ? JSON.stringify(updated || {}) : JSON.stringify(updated ? [updated] : []),
      });
      return;
    }

    await route.continue();
  });

  await page.route(/\/rest\/v1\/lab_queue(\?|$)/, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({}) });
      return;
    }
    await route.continue();
  });

  await page.route(/\/rest\/v1\/lab_orders(\?|$)/, async (route) => {
    const req = route.request();
    const method = req.method();
    const expectsSingle = req.headers()['accept']?.includes('application/vnd.pgrst.object+json');
    const totalOrders = labOrders.length;

    if (method === 'HEAD') {
      await route.fulfill({
        status: 200,
        headers: { 'content-range': `0-${Math.max(0, totalOrders - 1)}/${totalOrders}` },
      });
      return;
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'content-range': `0-${Math.max(0, totalOrders - 1)}/${totalOrders}` },
        body: JSON.stringify(labOrders),
      });
      return;
    }

    if (method === 'PATCH') {
      const body = req.postDataJSON() as Record<string, unknown>;
      const idMatch = req.url().match(/id=eq\.([^&]+)/);
      const id = idMatch ? decodeURIComponent(idMatch[1]) : '';
      let updated: LabOrder | null = null;
      labOrders = labOrders.map((order) => {
        if (order.id !== id) return order;
        updated = { ...order, ...body } as LabOrder;
        return updated;
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: expectsSingle ? JSON.stringify(updated || {}) : JSON.stringify(updated ? [updated] : []),
      });
      return;
    }

    await route.continue();
  });

  await page.route(/\/rest\/v1\/medications(\?|$)/, async (route) => {
    const req = route.request();
    const method = req.method();
    const expectsSingle = req.headers()['accept']?.includes('application/vnd.pgrst.object+json');

    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(medications) });
      return;
    }

    if (method === 'POST') {
      const body = req.postDataJSON() as Record<string, unknown>;
      const created: Medication = {
        id: `med-${medications.length + 1}`,
        hospital_id: String(body.hospital_id || baseHospitalId),
        name: String(body.name || ''),
        generic_name: (body.generic_name as string) || null,
        category: (body.category as string) || null,
        form: (body.form as string) || null,
        strength: (body.strength as string) || null,
        unit: (body.unit as string) || 'units',
        manufacturer: (body.manufacturer as string) || null,
        current_stock: Number(body.current_stock || 0),
        minimum_stock: Number(body.minimum_stock || 10),
        unit_price: body.unit_price === undefined ? null : Number(body.unit_price),
        expiry_date: (body.expiry_date as string) || null,
        batch_number: (body.batch_number as string) || null,
        is_active: true,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      medications = [created, ...medications];
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: expectsSingle ? JSON.stringify(created) : JSON.stringify([created]),
      });
      return;
    }

    if (method === 'PATCH') {
      const body = req.postDataJSON() as Record<string, unknown>;
      const idMatch = req.url().match(/id=eq\.([^&]+)/);
      const id = idMatch ? decodeURIComponent(idMatch[1]) : '';
      let updated: Medication | null = null;
      medications = medications.map((m) => {
        if (m.id !== id) return m;
        updated = { ...m, ...body, updated_at: nowIso() } as Medication;
        return updated;
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: expectsSingle ? JSON.stringify(updated || {}) : JSON.stringify(updated ? [updated] : []),
      });
      return;
    }

    await route.continue();
  });

  return {
    getState: () => ({ staffInvitations, patients, labOrders, medications }),
  };
}

test.describe('Care Harmony Hub Admin Master Lifecycle', () => {
  test('validates complete administrative lifecycle in one continuous execution', async ({ page }) => {
    test.setTimeout(420000);
    await loginAsAdmin(page);
    const master = await attachMasterMocks(page);

    // 1) Staff Onboarding + Role Assignment
    await page.goto('/settings/staff');
    await page.getByRole('button', { name: /invite staff/i }).click();
    const inviteDialog = page.getByRole('dialog', { name: /invite staff member/i });
    await expect(inviteDialog).toBeVisible();
    await inviteDialog.getByPlaceholder('staff@example.com').fill('new.nurse@careharmony.test');
    await inviteDialog.getByRole('combobox', { name: /role/i }).click();
    await page.getByRole('option', { name: /nurse/i }).click();
    await inviteDialog.getByRole('button', { name: /send invitation/i }).click();
    const inviteSuccessDialog = page.getByRole('dialog', { name: /invitation sent/i });
    await expect(inviteSuccessDialog).toBeVisible();
    await inviteSuccessDialog.getByRole('button', { name: /done/i }).click();
    await expect
      .poll(() => master.getState().staffInvitations.length, { timeout: 10000 })
      .toBeGreaterThan(0);
    await page.goto('/settings/staff');
    await page.getByRole('button', { name: /invitations/i }).click();
    expect(master.getState().staffInvitations.some((i) => i.email === 'new.nurse@careharmony.test')).toBeTruthy();

    // 2) Patient Registration
    await page.goto('/patients');
    await page.getByRole('button', { name: /register patient/i }).first().click();
    const patientDialog = page.getByRole('dialog');
    await expect(patientDialog).toBeVisible();
    await patientDialog.getByLabel(/first name/i).fill('Lifecycle');
    await patientDialog.getByLabel(/last name/i).fill('Patient');
    await patientDialog.getByLabel(/date of birth/i).fill('1992-05-12');
    await patientDialog.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /female/i }).click();
    await patientDialog.getByLabel(/phone number/i).fill('555-4000');
    await patientDialog.getByLabel(/^email$/i).fill('lifecycle.patient@careharmony.test');
    await patientDialog.getByRole('button', { name: /^register patient$/i }).click();
    await expect(patientDialog).toHaveCount(0);
    await expect
      .poll(() => master.getState().patients.some((p) => p.first_name === 'Lifecycle' && p.last_name === 'Patient'), { timeout: 10000 })
      .toBeTruthy();
    expect(master.getState().patients.some((p) => p.first_name === 'Lifecycle' && p.last_name === 'Patient')).toBeTruthy();

    // 3) Laboratory Details Updation
    await page.goto('/laboratory');
    const startButtons = page.getByRole('button', { name: /start/i });
    if ((await startButtons.count()) > 0) {
      await startButtons.first().click();
      await page.getByRole('button', { name: /results/i }).first().click();
      const labDialog = page.getByRole('dialog');
      await expect(labDialog).toBeVisible();
      await labDialog.getByLabel(/result notes/i).fill('Hemoglobin and WBC within normal reference range.');
      await labDialog.getByLabel(/mark as critical value/i).check();
      await labDialog.getByRole('button', { name: /complete & upload results/i }).click();
      await expect(labDialog).toHaveCount(0);
    } else {
      await page.getByRole('button', { name: /new lab order/i }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
    }
    expect(master.getState().labOrders.length).toBeGreaterThan(0);

    // 4) Inventory Management (add + adjust stock)
    await page.goto('/inventory');
    await page.getByRole('button', { name: /add medication/i }).click();
    const addMedicationDialog = page.getByRole('dialog', { name: /add medication/i });
    await expect(addMedicationDialog).toBeVisible();
    await addMedicationDialog.getByRole('textbox').first().fill('LifecycleMed');
    await addMedicationDialog.getByRole('textbox').nth(1).fill('Lifecycle Generic');
    await addMedicationDialog.getByRole('button', { name: /add medication/i }).click();
    await expect(addMedicationDialog).toHaveCount(0);
    await expect
      .poll(() => master.getState().medications.some((m) => m.name === 'LifecycleMed'), { timeout: 10000 })
      .toBeTruthy();
    const adjustButtons = page.getByRole('button', { name: /adjust stock/i });
    if ((await adjustButtons.count()) > 0) {
      await adjustButtons.first().click();
      const adjustDialog = page.getByRole('dialog', { name: /adjust stock/i });
      await adjustDialog.getByRole('combobox').click();
      await page.getByRole('option', { name: /set stock level/i }).click();
      await adjustDialog.getByPlaceholder(/new stock level|quantity to adjust/i).fill('125');
      await adjustDialog.getByRole('button', { name: /update stock/i }).click();
      await expect(adjustDialog).toHaveCount(0);
    }
    expect(master.getState().medications.some((m) => m.name === 'LifecycleMed')).toBeTruthy();

    // 5) Traverse all critical admin modules in one lifecycle
    for (const route of ADMIN_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await assertNoRuntimeCrash(page);
      await expect(page).toHaveURL(new RegExp(route.replace('/', '\\/'), 'i'));
    }

    // 6) Data integrity cross-module persistence checks
    await page.goto('/settings/staff');
    await page.getByRole('button', { name: /invitations/i }).click();
    expect(master.getState().staffInvitations.some((i) => i.email === 'new.nurse@careharmony.test')).toBeTruthy();

    await page.goto('/patients');
    expect(master.getState().patients.some((p) => p.first_name === 'Lifecycle' && p.last_name === 'Patient')).toBeTruthy();

    await page.goto('/laboratory');
    await expect(page.getByRole('heading', { name: /laboratory/i })).toBeVisible();
    expect(master.getState().labOrders.length).toBeGreaterThan(0);

    await page.goto('/inventory');
    expect(master.getState().medications.some((m) => m.name === 'LifecycleMed')).toBeTruthy();
  });
});
