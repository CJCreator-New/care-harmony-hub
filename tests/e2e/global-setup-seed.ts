/**
 * Global Setup & Data Seeding
 *
 * Runs ONCE before the full E2E suite (playwright.e2e-full.config.ts).
 * Responsibilities:
 *   1. Ensure test hospital exists (via UI registration if needed)
 *   2. Pre-authenticate all 7 roles and persist storage states
 *   3. Seed baseline data: patients, appointments, medications
 *
 * All seeded record IDs are written to test-results/.seed-manifest.json
 * so individual spec files can reference them without re-creating data.
 */

import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..', '..'); // project root
const AUTH_DIR = path.join(ROOT_DIR, 'test-results', '.auth-full');
const MANIFEST_PATH = path.join(ROOT_DIR, 'test-results', '.seed-manifest.json');
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8080';

// ─── Read Supabase config from .env ──────────────────────────────────────────
function readEnv(): Record<string, string> {
  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs.readFileSync(envPath, 'utf-8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#') && l.includes('='))
      .map(l => {
        const idx = l.indexOf('=');
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')];
      })
  );
}
const ENV = readEnv();
const SUPABASE_URL = ENV.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = ENV.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// ─── Supabase REST helpers ────────────────────────────────────────────────────

async function supabaseSignIn(email: string, password: string): Promise<{ access_token: string; user: { id: string } } | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function supabaseQuery<T = unknown>(
  table: string,
  jwt: string,
  method: 'GET' | 'POST' = 'GET',
  body?: object,
  params?: string,
): Promise<T | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/${table}${params ? `?${params}` : ''}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${jwt}`,
        'Prefer': method === 'POST' ? 'return=representation' : '',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

// ─── Role credentials (mirrors config/test-users.ts) ──────────────────────────
const ALL_ROLES = [
  { role: 'admin',          email: 'admin@testgeneral.com',       password: 'TestPass123!' },
  { role: 'doctor',         email: 'doctor@testgeneral.com',      password: 'TestPass123!' },
  { role: 'nurse',          email: 'nurse@testgeneral.com',       password: 'TestPass123!' },
  { role: 'receptionist',   email: 'reception@testgeneral.com',   password: 'TestPass123!' },
  { role: 'pharmacist',     email: 'pharmacy@testgeneral.com',    password: 'TestPass123!' },
  { role: 'lab_technician', email: 'lab@testgeneral.com',         password: 'TestPass123!' },
  { role: 'patient',        email: 'patient@testgeneral.com',     password: 'TestPass123!' },
] as const;

// ─── Seed data constants ──────────────────────────────────────────────────────
const SEED = {
  HOSPITAL: {
    name: 'Test General Hospital',
    address: '1 Test Avenue',
    city: 'Testville',
    state: 'TX',
    zip: '75001',
    phone: '(555) 000-1111',
    email: `hospital_seed@testgeneral.com`,
    license: 'LIC-SEED-001',
  },
  PATIENTS: [
    { firstName: 'Alice',   lastName: 'SeedPatient',  dob: '1985-03-12', gender: 'female', phone: '555-1001', email: 'alice.seed@example.com' },
    { firstName: 'Bob',     lastName: 'SeedPatient',  dob: '1972-09-22', gender: 'male',   phone: '555-1002', email: 'bob.seed@example.com' },
    { firstName: 'Carol',   lastName: 'SeedPatient',  dob: '1990-06-05', gender: 'female', phone: '555-1003', email: 'carol.seed@example.com' },
  ],
  MEDICATIONS: [
    { name: 'Lisinopril',    dosage: '10mg',  quantity: 100, reorderLevel: 10 },
    { name: 'Metformin',     dosage: '500mg', quantity: 200, reorderLevel: 20 },
    { name: 'Atorvastatin',  dosage: '20mg',  quantity: 150, reorderLevel: 15 },
    { name: 'Amlodipine',    dosage: '5mg',   quantity: 120, reorderLevel: 12 },
    { name: 'Omeprazole',    dosage: '20mg',  quantity: 80,  reorderLevel: 8  },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function tryLogin(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/hospital/login`);
  await page.waitForLoadState('domcontentloaded');

  const emailInput = page.getByLabel(/email/i).first();
  const passwordInput = page.getByLabel(/password/i).first();
  const submitBtn = page.getByRole('button', { name: /sign in|log in|login/i });

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitBtn.click();

  // Wait for navigation away from the login page
  await page.waitForURL(
    (url) => !url.pathname.includes('/hospital/login') && !url.pathname.includes('/login'),
    { timeout: 30_000 }
  );
  await page.waitForLoadState('networkidle');
}

// ─── Step 0.1-0.3: Ensure hospital & all role accounts exist ─────────────────

async function ensureHospitalExists(page: import('@playwright/test').Page): Promise<boolean> {
  // Try logging in as admin first — if it works, hospital already exists
  try {
    await tryLogin(page, 'admin@testgeneral.com', 'TestPass123!');
    console.log('  ✓ Hospital already exists — skipping registration');
    return true;
  } catch {
    console.log('  → Hospital not found, registering…');
  }

  // Register hospital via the UI signup wizard
  await page.goto(`${BASE_URL}/hospital/signup`);
  await page.waitForLoadState('networkidle');

  // Step 1: Hospital details
  const s = SEED.HOSPITAL;
  for (const [label, value] of [
    [/Hospital Name/i,   s.name],
    [/Address/i,         s.address],
    [/City/i,            s.city],
    [/State/i,           s.state],
    [/ZIP/i,             s.zip],
    [/Phone/i,           s.phone],
    [/Hospital Email/i,  s.email],
    [/License/i,         s.license],
  ] as [RegExp, string][]) {
    await page.getByLabel(label).first().fill(value);
  }
  await page.getByRole('button', { name: /continue/i }).click();
  await page.waitForLoadState('networkidle');

  // Step 2: Admin credentials
  for (const [label, value] of [
    [/First Name/i,       'Admin'],
    [/Last Name/i,        'User'],
    [/Admin Email/i,      'admin@testgeneral.com'],
    [/^Password/i,        'TestPass123!'],
    [/Confirm Password/i, 'TestPass123!'],
  ] as [RegExp, string][]) {
    await page.getByLabel(label).first().fill(value);
  }
  await page.getByRole('button', { name: /Create Account|Register/i }).click();

  // Wait for any post-registration redirect
  await page.waitForURL(/\/(dashboard|account-setup|role-setup|hospital\/login)/, { timeout: 30_000 });
  console.log('  ✓ Hospital registered');
  return true;
}

// ─── Step 0.2-0.3: Ensure all 7 role test accounts exist ─────────────────────

const STAFF_ROLES_TO_CREATE = [
  { role: 'doctor',       email: 'doctor@testgeneral.com',     firstName: 'Dr. Jane',   lastName: 'Smith'      },
  { role: 'nurse',        email: 'nurse@testgeneral.com',      firstName: 'Nancy',      lastName: 'Nurse'      },
  { role: 'receptionist', email: 'reception@testgeneral.com',  firstName: 'Rachel',     lastName: 'Reception'  },
  { role: 'pharmacist',   email: 'pharmacy@testgeneral.com',   firstName: 'Phil',       lastName: 'Pharma'     },
  { role: 'lab_technician', email: 'lab@testgeneral.com',      firstName: 'Larry',      lastName: 'Lab'        },
  { role: 'patient',      email: 'patient@testgeneral.com',    firstName: 'Patient',    lastName: 'Test'       },
] as const;

async function ensureTestUsersExist(_browser: import('@playwright/test').Browser): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('  ⚠ SUPABASE_URL/ANON_KEY not configured — skipping staff user creation');
    return;
  }

  // Sign in as admin via REST
  const adminSession = await supabaseSignIn('admin@testgeneral.com', 'TestPass123!');
  if (!adminSession?.access_token) {
    console.warn('  ⚠ Could not sign in as admin via REST — skipping staff user creation');
    return;
  }

  const adminJwt = adminSession.access_token;
  const adminId = adminSession.user.id;
  console.log(`  [debug] Admin signed in via REST: ${adminId.slice(0, 8)}…`);

  // Get admin's hospital_id from profiles table (keyed by user_id, not id)
  type ProfileRow = { id: string; hospital_id: string };
  const profiles = await supabaseQuery<ProfileRow[]>(
    'profiles',
    adminJwt,
    'GET',
    undefined,
    `select=id,hospital_id&user_id=eq.${adminId}&limit=1`,
  );
  const hospitalId = profiles?.[0]?.hospital_id;
  console.log(`  [debug] profiles returned: ${JSON.stringify(profiles)?.slice(0, 120)}`);
  if (!hospitalId) {
    console.warn('  ⚠ Could not determine hospital_id — skipping staff user creation');
    return;
  }

  for (const staff of STAFF_ROLES_TO_CREATE) {
    // Check if user can already log in (skip if they exist)
    const existingSession = await supabaseSignIn(staff.email, 'TestPass123!');
    if (existingSession?.access_token) {
      console.log(`  ✓ ${staff.role} already exists — skipping`);
      continue;
    }

    try {
      // 1. Sign up the user via anon endpoint (no edge functions needed)
      const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: staff.email,
          password: 'TestPass123!',
          data: { first_name: staff.firstName, last_name: staff.lastName },
        }),
      });

      if (!signupRes.ok) {
        const err = await signupRes.json().catch(() => ({}));
        console.warn(`  ⚠ Signup failed for ${staff.role}: ${JSON.stringify(err)}`);
        continue;
      }

      const signupData: any = await signupRes.json();
      const staffJwt: string | undefined = signupData?.access_token;
      const userId: string | undefined = signupData?.user?.id;

      if (!staffJwt || !userId) {
        console.warn(`  ⚠ No session returned for ${staff.role} — email confirmation may be required`);
        continue;
      }

      // 2. Insert the profile (user can insert their own profile with hospital_id)
      const profileInsert = await supabaseQuery<ProfileRow[]>(
        'profiles',
        staffJwt,
        'POST',
        { user_id: userId, hospital_id: hospitalId, first_name: staff.firstName, last_name: staff.lastName, email: staff.email },
      );
      if (!profileInsert?.[0]?.id) {
        console.warn(`  ⚠ Profile creation may have failed for ${staff.role}: ${JSON.stringify(profileInsert)?.slice(0, 80)}`);
      }

      // 3. Admin assigns the role via user_roles (admin can manage all roles per RLS)
      await supabaseQuery(
        'user_roles',
        adminJwt,
        'POST',
        { user_id: userId, role: staff.role, hospital_id: hospitalId },
      );

      console.log(`  ✓ Created ${staff.role}: ${staff.email}`);
    } catch (err) {
      console.warn(`  ⚠ Could not create ${staff.role}: ${err}`);
    }
  }
}

// ─── Step 0.4: Seed test patients ─────────────────────────────────────────────

async function seedPatients(page: import('@playwright/test').Page): Promise<string[]> {
  const ids: string[] = [];

  // Navigate to the patients list page (registration is via a modal here)
  await page.goto(`${BASE_URL}/patients`);
  await page.waitForLoadState('networkidle');

  for (const p of SEED.PATIENTS) {
    try {
      // Open the registration modal
      await page.getByRole('button', { name: /Register Patient/i }).first().click();
      await page.waitForSelector('[role="dialog"]', { timeout: 10_000 });

      // Fill the modal form (FormLabel creates proper aria links in shadcn)
      await page.getByLabel(/First Name/i).first().fill(p.firstName);
      await page.getByLabel(/Last Name/i).first().fill(p.lastName);
      await page.getByLabel(/Date of Birth/i).first().fill(p.dob);
      await page.getByLabel(/Phone/i).first().fill(p.phone);
      await page.getByLabel(/Email/i).first().fill(p.email);

      // Gender is a Select — trigger then pick option
      const genderTrigger = page.getByLabel(/Gender/i).first();
      if (await genderTrigger.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await genderTrigger.click();
        await page.getByRole('option', { name: new RegExp(p.gender, 'i') }).first().click().catch(() => {});
      }

      await page.getByRole('button', { name: /Register Patient|Save|Create/i }).last().click();
      await page.waitForLoadState('networkidle');

      // Close dialog if still open
      await page.keyboard.press('Escape').catch(() => {});

      console.log(`  ✓ Patient seeded: ${p.firstName} ${p.lastName}`);
    } catch (err) {
      console.warn(`  ⚠ Could not seed patient ${p.firstName}: ${err}`);
      // Close any open dialog before next iteration
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  // Capture any patient IDs visible in the list
  try {
    const rows = await page.locator('table tbody tr').all();
    for (const row of rows.slice(0, 3)) {
      const link = row.locator('a[href*="/patients/"]').first();
      const href = await link.getAttribute('href').catch(() => null);
      if (href) {
        const match = href.match(/\/patients\/([a-f0-9-]{36})/);
        if (match) ids.push(match[1]);
      }
    }
  } catch { /* non-fatal */ }

  return ids;
}

// ─── Step 0.5: Seed appointments ─────────────────────────────────────────────

async function seedAppointments(page: import('@playwright/test').Page, _patientIds: string[]): Promise<string[]> {
  const ids: string[] = [];
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];

  await page.goto(`${BASE_URL}/appointments`);
  await page.waitForLoadState('networkidle');

  for (let i = 0; i < Math.min(2, SEED.PATIENTS.length); i++) {
    try {
      // Open the Schedule Appointment modal
      await page.getByRole('button', { name: /Schedule Appointment/i }).first().click();
      await page.waitForSelector('[role="dialog"]', { timeout: 10_000 });

      // Patient field (FormLabel "Patient *")
      const patientInput = page.getByLabel(/Patient/i).first();
      if (await patientInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await patientInput.fill(SEED.PATIENTS[i].firstName);
        await page.getByRole('option').first().click().catch(() => {});
      }

      // Date and time (FormLabel "Date *" and "Time *")
      await page.getByLabel(/^Date/i).first().fill(tomorrow);
      await page.getByLabel(/^Time/i).first().fill('10:00').catch(() => {});

      // Reason for visit
      await page.getByLabel(/Reason for Visit/i).first().fill('Routine checkup — seed data').catch(() => {});

      await page.getByRole('button', { name: /Schedule|Save|Book/i }).last().click();
      await page.waitForLoadState('networkidle');
      await page.keyboard.press('Escape').catch(() => {});

      console.log(`  ✓ Appointment seeded for patient ${i + 1}`);
    } catch (err) {
      console.warn(`  ⚠ Could not seed appointment ${i + 1}: ${err}`);
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  return ids;
}

// ─── Step 0.6: Seed pharmacy inventory ───────────────────────────────────────

async function seedInventory(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(`${BASE_URL}/inventory`);
  await page.waitForLoadState('networkidle');

  for (const med of SEED.MEDICATIONS) {
    try {
      // Open the Add Medication dialog
      await page.getByRole('button', { name: /Add Medication/i }).first().click();
      await page.waitForSelector('[role="dialog"]', { timeout: 10_000 });

      // The InventoryPage uses plain <Label> (no htmlFor), so target inputs positionally
      // inside the dialog. Medication Name is the 1st textbox, Generic Name the 2nd.
      const dialog = page.locator('[role="dialog"]');
      const textboxes = dialog.getByRole('textbox');
      await textboxes.nth(0).fill(med.name);        // Medication Name *
      await textboxes.nth(1).fill(med.name).catch(() => {});  // Generic Name (optional)

      // Strength field (has placeholder "e.g., 500mg")
      await dialog.getByPlaceholder(/e\.g\.,?\s*500mg/i).fill(med.dosage).catch(() => {});

      // Submit
      await dialog.getByRole('button', { name: /Add Medication/i }).click();
      await page.waitForLoadState('networkidle');
      await page.keyboard.press('Escape').catch(() => {});

      console.log(`  ✓ Medication seeded: ${med.name}`);
    } catch (err) {
      console.warn(`  ⚠ Could not seed medication ${med.name}: ${err}`);
      await page.keyboard.press('Escape').catch(() => {});
    }
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default async function globalSetupSeed(_config: FullConfig) {
  console.log('\n════════════════════════════════════════════');
  console.log('  Phase 0 — Global Setup & Data Seeding');
  console.log('════════════════════════════════════════════\n');

  await ensureDir(AUTH_DIR);
  await ensureDir(path.dirname(MANIFEST_PATH));

  const browser = await chromium.launch({ headless: true });

  // ── 0.1-0.3: Ensure hospital + staff accounts ──────────────────────────────
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await ensureHospitalExists(page);
    await ctx.close();
  }

  console.log('\n[Step 0.2-0.3] Ensuring all test staff accounts exist…');
  await ensureTestUsersExist(browser);

  // ── 0.4-0.6: Seed data as admin ────────────────────────────────────────────
  const seededPatientIds: string[] = [];
  const seededAppointmentIds: string[] = [];

  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await tryLogin(page, 'admin@testgeneral.com', 'TestPass123!');

      console.log('\n[Step 0.4] Seeding patients…');
      const pIds = await seedPatients(page);
      seededPatientIds.push(...pIds);

      console.log('\n[Step 0.5] Seeding appointments…');
      const aIds = await seedAppointments(page, seededPatientIds);
      seededAppointmentIds.push(...aIds);
    } catch (err) {
      console.warn(`  ⚠ Admin seeding failed: ${err}`);
    } finally {
      await ctx.close();
    }
  }

  // Pharmacist seeds inventory
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await tryLogin(page, 'pharmacy@testgeneral.com', 'TestPass123!');
      console.log('\n[Step 0.6] Seeding pharmacy inventory…');
      await seedInventory(page);
    } catch (err) {
      console.warn(`  ⚠ Pharmacist login/seeding failed — skipping inventory seed: ${err}`);
    } finally {
      await ctx.close();
    }
  }

  // ── Pre-authenticate all 7 roles and save storage states ──────────────────
  console.log('\n[Phase 0] Pre-authenticating roles…');
  for (const { role, email, password } of ALL_ROLES) {
    const authFile = path.join(AUTH_DIR, `${role}.json`);
    try {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();

      await page.goto(`${BASE_URL}/hospital/login`);
      await page.waitForLoadState('domcontentloaded');
      await page.getByLabel(/email/i).first().fill(email);
      await page.getByLabel(/password/i).first().fill(password);
      await page.getByRole('button', { name: /sign in|log in|login/i }).click();
      // Wait for navigation away from login
      await page.waitForURL(
        (url) => !url.pathname.includes('/hospital/login') && !url.pathname.includes('/login'),
        { timeout: 30_000 }
      );

      await ctx.storageState({ path: authFile });
      console.log(`  ✓ Auth state saved: ${role}`);
      await ctx.close();
    } catch (err) {
      console.warn(`  ⚠ Auth pre-setup failed for ${role}: ${err}`);
    }
  }

  await browser.close();

  // ── Write seed manifest ────────────────────────────────────────────────────
  const manifest = {
    timestamp: new Date().toISOString(),
    baseURL: BASE_URL,
    hospitalName: SEED.HOSPITAL.name,
    seededPatientIds,
    seededAppointmentIds,
    medications: SEED.MEDICATIONS.map(m => m.name),
    authStateDir: AUTH_DIR,
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\n✅ Seed manifest written → ${MANIFEST_PATH}`);
  console.log('════════════════════════════════════════════\n');
}
