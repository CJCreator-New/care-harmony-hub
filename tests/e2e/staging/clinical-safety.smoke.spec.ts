/**
 * S0-07 clinical safety smoke test (staging only).
 *
 * Definition of Done (audit roadmap item S0-07):
 *   (a) "Penicillin allergy" / "PCN" block amoxicillin at the prescriber step
 *       (consultation Treatment Plan) and at the pharmacist approval modal.
 *   (b) When the patient safety context cannot load, the order needs a
 *       documented override (>= 10 characters) before it can be sent; when it
 *       cannot load at all, the order is blocked outright.
 *   (c) The doctor's NEWS2 equals the nurse's for HR 140, BP 80/50, RR 30,
 *       SpO2 85 (HIGH).
 *
 * Safety of the run itself:
 *   - Skipped unless the E2E_STAGING_* variables are set (see README.md here).
 *   - Refuses to run when a target URL is a production host, and aborts any
 *     browser request to a production host (the test then fails).
 *   - Creates no patients and writes no clinical data: Supabase writes are
 *     aborted by the network guard; the nurse's prep submission and critical-
 *     vitals notification are captured and answered locally, not stored.
 *
 * Run: npm run test:e2e:staging:clinical
 */

import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { assertStagingTargets, missingVars, readStagingEnv, type StagingEnv } from './staging-env';
import { StagingNetwork, loginAs, readNews2, restRead, restWrite, type NetworkRule } from './staging-guard';

const env = readStagingEnv();
// Refuse (fail, not skip) when an operator-supplied URL is production.
assertStagingTargets(env);

const OVERRIDE_REASON = 'Allergies and home medications verified verbally with the patient (staging smoke test).';
const PENICILLIN_TERMS = [/vs Documented Penicillin allergy/i, /vs Documented PCN/i];

interface RoleSession {
  readonly context: BrowserContext;
  readonly page: Page;
  readonly net: StagingNetwork;
}

async function openSession(browser: Browser, configure?: (net: StagingNetwork) => void): Promise<RoleSession> {
  const context = await browser.newContext({ baseURL: env.baseUrl, viewport: { width: 1440, height: 900 } });
  const net = new StagingNetwork(env);
  configure?.(net);
  await net.install(context);
  const page = await context.newPage();
  return { context, page, net };
}

async function closeSession(s: RoleSession | undefined): Promise<void> {
  if (!s) return;
  test.info().annotations.push({
    type: 'blocked-writes',
    description: s.net.blockedWrites.map((w) => `${w.method} ${w.path}`).join(', ') || 'none',
  });
  await s.context.close();
  s.net.assertNoProductionTraffic();
}

const skipUnless = (needs: Parameters<typeof missingVars>[1]) => {
  const missing = missingVars(env, needs);
  test.skip(missing.length > 0, `Staging env not configured. Missing: ${missing.join(', ')}`);
};

// ─── Prescriber helpers ───────────────────────────────────────────────────────

const safetyPanel = (page: Page) => page.getByRole('region', { name: 'Medication safety checks' }).first();
const blockToast = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasText: /Cannot continue:/ });

async function openTreatmentPlan(page: Page, e: StagingEnv): Promise<void> {
  await page.goto(`/consultations/${e.consultationId}`);
  await expect(page.getByRole('heading', { name: 'Consultation Workflow' })).toBeVisible({ timeout: 45_000 });
  await expect(
    page.getByText('Finalized Record'),
    'E2E_STAGING_CONSULTATION_ID must be an in-progress (not completed) consultation'
  ).toHaveCount(0);

  if (!(await page.getByText('Step 4 of 5').isVisible())) {
    const column = page.locator('span', { hasText: /^Treatment Plan$/ }).locator('xpath=..');
    const stepButton = column.locator('button').first();
    await expect(
      stepButton,
      'E2E_STAGING_CONSULTATION_ID must have reached step 4 (Treatment Plan) or later'
    ).toBeEnabled();
    await stepButton.click();
  }
  await expect(page.getByText('Step 4 of 5')).toBeVisible();
  await expect(page.getByText('Define prescriptions, lab orders, and referrals')).toBeVisible();

  // Next is gated on a non-empty plan before the safety gate runs.
  const plan = page.locator('#treatment_plan');
  if (!(await plan.inputValue()).trim()) await plan.fill('Staging smoke test plan (not saved).');
}

async function addPrescription(page: Page, rx: { name: string; dose: string; freq: string; duration: string }) {
  await page.getByPlaceholder('Medication', { exact: true }).fill(rx.name);
  await page.getByPlaceholder('Dosage', { exact: true }).fill(rx.dose);
  await page.getByPlaceholder('Frequency', { exact: true }).fill(rx.freq);
  await page.getByPlaceholder('Duration', { exact: true }).fill(rx.duration);
  return page.getByRole('button', { name: 'Add prescription' });
}

/** Lets the 1.5 s autosave fire (and be blocked) so later write counts measure only Next. */
const settleAutosave = (page: Page) => page.waitForTimeout(2_500);

/**
 * Saving a consultation first encrypts its narrative fields through the
 * phi-crypto edge function, then PATCHes the row. Encrypt calls are aborted
 * (nothing to store) and counted as a send attempt. Decrypt calls pass.
 */
const blockPhiEncrypt: NetworkRule = {
  name: 'block-phi-encrypt',
  match: (req, url) => {
    if (req.method() !== 'POST' || !url.pathname.endsWith('/functions/v1/phi-crypto')) return false;
    try {
      return (req.postDataJSON() as { action?: string } | null)?.action === 'encrypt';
    } catch {
      return false;
    }
  },
  action: { kind: 'abort' },
};

/** Requests that show the consultation was being sent (encrypt + PATCH), after the gate. */
const sendAttempts = (s: RoleSession) =>
  s.net.blockedWrites.filter((w) => w.path.endsWith('/rest/v1/consultations')).length +
  s.net.hits(blockPhiEncrypt.name).length;

// ─── (a) + (b): prescriber ────────────────────────────────────────────────────

test.describe('S0-07 prescriber safety gate @staging @clinical @s0-07', () => {
  skipUnless({ roles: ['doctor'], consultation: true });

  test('(a) penicillin allergy blocks amoxicillin at the consultation prescribing step', async ({ browser }) => {
    let s: RoleSession | undefined;
    try {
      s = await openSession(browser, (net) => net.addRule(blockPhiEncrypt));
      await loginAs(s.page, env, 'doctor');
      s.net.assertNoProductionTraffic();
      await openTreatmentPlan(s.page, env);
      const { page } = s;

      const add = await addPrescription(page, { name: 'Amoxicillin', dose: '500 mg', freq: 'TID', duration: '7 days' });
      // Draft preview warns before the row is added.
      await expect(page.getByText(/Allergy Conflict: Amoxicillin vs Documented/i).first()).toBeVisible({ timeout: 20_000 });
      await add.click();

      const panel = safetyPanel(page);
      for (const term of PENICILLIN_TERMS) {
        await expect(panel.getByText(term).first(), `missing allergy finding ${term}`).toBeVisible({ timeout: 20_000 });
      }
      await expect(panel.getByLabel(/Clinical override rationale/).first()).toBeVisible();
      await expect(page.getByText('Safety review required')).toBeVisible();

      await settleAutosave(page);
      const before = sendAttempts(s);
      await page.getByRole('button', { name: /^Next$/ }).click();
      await expect(blockToast(page)).toContainText(/document a clinical override/i);
      await expect(page.getByText('Step 4 of 5')).toBeVisible();
      await page.waitForTimeout(1_500);
      expect(sendAttempts(s), 'consultation must not be sent while the allergy is unresolved').toBe(before);
    } finally {
      await closeSession(s);
    }
  });

  test('(b) partial safety-context outage requires a documented override before sending', async ({ browser }) => {
    let s: RoleSession | undefined;
    try {
      s = await openSession(browser, (net) => {
        // The patient-context read of prior prescriptions (order-safety loader) fails.
        net.addRule({
          name: 'abort-context-prescriptions',
          match: restRead('prescriptions', (q) => q.includes('prescription_items') && q.includes(`patient_id=eq.${env.patientId}`)),
          action: { kind: 'abort' },
        });
        net.addRule(blockPhiEncrypt);
      });
      await loginAs(s.page, env, 'doctor');
      s.net.assertNoProductionTraffic();
      await openTreatmentPlan(s.page, env);
      const { page } = s;

      await (await addPrescription(page, { name: 'Paracetamol', dose: '500 mg', freq: 'TID', duration: '3 days' })).click();
      expect(s.net.hits('abort-context-prescriptions').length, 'outage simulation did not intercept the context read').toBeGreaterThan(0);

      const panel = safetyPanel(page);
      const finding = panel.getByRole('alert').filter({ hasText: 'Safety screening incomplete' });
      await expect(finding).toBeVisible({ timeout: 20_000 });
      await expect(finding).toContainText('existing prescriptions could not be loaded');

      // Blocked before documentation.
      await settleAutosave(page);
      const before = sendAttempts(s);
      await page.getByRole('button', { name: /^Next$/ }).click();
      await expect(blockToast(page)).toContainText(/document a clinical override/i);
      await page.waitForTimeout(1_500);
      expect(sendAttempts(s)).toBe(before);
      await expect(blockToast(page)).toHaveCount(0, { timeout: 15_000 });

      // Under 10 characters cannot be documented.
      const reason = finding.getByLabel(/Clinical override rationale/);
      const documentBtn = finding.getByRole('button', { name: 'Document' });
      await reason.fill('too short');
      await expect(finding).toContainText('(9/10)');
      await expect(documentBtn).toBeDisabled();

      await reason.fill(OVERRIDE_REASON);
      await expect(documentBtn).toBeEnabled();
      await documentBtn.click();
      await expect(finding).toContainText('Documented:');
      await expect(finding).toContainText(OVERRIDE_REASON);
      await expect(page.getByText('Safety review required')).toHaveCount(0);

      // Gate open: Next now tries to send (the write itself is blocked by the guard).
      await page.getByRole('button', { name: /^Next$/ }).click();
      await expect.poll(() => sendAttempts(s!), { timeout: 15_000 }).toBeGreaterThan(before);
      await expect(blockToast(page)).toHaveCount(0);
    } finally {
      await closeSession(s);
    }
  });

  test('(b) total safety-context outage blocks the order with no override path', async ({ browser }) => {
    let s: RoleSession | undefined;
    try {
      s = await openSession(browser, (net) => {
        // The patient record read (allergies, home medications) fails.
        net.addRule({
          name: 'abort-context-patient',
          match: restRead(
            'patients',
            (q) => q.includes('allergies,current_medications') && q.includes(`id=eq.${env.patientId}`)
          ),
          action: { kind: 'abort' },
        });
        net.addRule(blockPhiEncrypt);
      });
      await loginAs(s.page, env, 'doctor');
      s.net.assertNoProductionTraffic();
      await openTreatmentPlan(s.page, env);
      const { page } = s;

      await (await addPrescription(page, { name: 'Paracetamol', dose: '500 mg', freq: 'TID', duration: '3 days' })).click();
      expect(s.net.hits('abort-context-patient').length, 'outage simulation did not intercept the patient read').toBeGreaterThan(0);

      const panel = safetyPanel(page);
      await expect(panel.getByText('Safety screening unavailable: order blocked')).toBeVisible({ timeout: 20_000 });
      await expect(panel.getByRole('textbox')).toHaveCount(0);

      await settleAutosave(page);
      const before = sendAttempts(s);
      await page.getByRole('button', { name: /^Next$/ }).click();
      await expect(blockToast(page)).toContainText(/could not be loaded/i);
      await page.waitForTimeout(1_500);
      expect(sendAttempts(s)).toBe(before);
    } finally {
      await closeSession(s);
    }
  });
});

// ─── (a): pharmacist ──────────────────────────────────────────────────────────

test.describe('S0-07 pharmacist verification gate @staging @clinical @s0-07', () => {
  skipUnless({ roles: ['pharmacist'] });

  test('(a) penicillin allergy blocks amoxicillin at the pharmacist approval modal', async ({ browser }) => {
    let s: RoleSession | undefined;
    try {
      s = await openSession(browser);
      await loginAs(s.page, env, 'pharmacist');
      s.net.assertNoProductionTraffic();
      const { page } = s;

      await page.goto('/pharmacy');
      await page.getByPlaceholder('Search by patient or MRN...').fill(env.patientMrn!);
      const row = page
        .getByRole('row')
        .filter({ hasText: env.patientMrn! })
        .filter({ hasText: /amoxicillin/i })
        .filter({ hasText: 'Pending Review' })
        .first();
      await expect(row, 'staging needs a pending amoxicillin prescription for the test patient').toBeVisible({ timeout: 45_000 });
      await row.getByRole('button', { name: 'Review & Approve' }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Pharmacist Clinical Verification & DUR Review')).toBeVisible();
      const panel = dialog.getByRole('region', { name: 'Medication safety checks' });
      for (const term of PENICILLIN_TERMS) {
        await expect(panel.getByText(term).first(), `missing allergy finding ${term}`).toBeVisible({ timeout: 20_000 });
      }

      const approve = dialog.getByRole('button', { name: 'Approve & Release to Dispense' });
      await expect(approve).toBeDisabled();

      const allergyFinding = panel.getByRole('alert').filter({ hasText: /Allergy Conflict: Amoxicillin/i }).first();
      await allergyFinding.getByLabel(/Pharmacist verification note/).fill('too short');
      await expect(allergyFinding.getByRole('button', { name: 'Document' })).toBeDisabled();
      await expect(approve).toBeDisabled();

      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).toHaveCount(0);
      expect(
        s.net.blockedWrites.filter((w) => /\/rest\/v1\/(prescriptions|prescription_items)$/.test(w.path)),
        'no prescription write may be attempted'
      ).toEqual([]);
    } finally {
      await closeSession(s);
    }
  });
});

// ─── (c): NEWS2 parity ────────────────────────────────────────────────────────

test.describe('S0-07 NEWS2 parity nurse -> doctor @staging @clinical @s0-07', () => {
  skipUnless({ roles: ['nurse', 'doctor'], consultation: true });

  test('(c) doctor NEWS2 equals nurse NEWS2 for HR 140, BP 80/50, RR 30, SpO2 85 (HIGH)', async ({ browser }) => {
    let nurse: RoleSession | undefined;
    let doctor: RoleSession | undefined;
    try {
      // Nurse: record the vitals through Patient Preparation. The submission is
      // captured and answered locally, so staging data is not changed.
      nurse = await openSession(browser, (net) => {
        net.addRule({ name: 'nurse-prep-rpc', match: restWrite('rpc/complete_patient_prep'), action: { kind: 'fulfill', status: 204 } });
        net.addRule({ name: 'nurse-critical-notification', match: restWrite('notifications'), action: { kind: 'fulfill', status: 201 } });
      });
      await loginAs(nurse.page, env, 'nurse');
      nurse.net.assertNoProductionTraffic();
      const np = nurse.page;
      await np.goto('/dashboard');
      const card = np
        .locator('div')
        .filter({ has: np.getByText(`MRN: ${env.patientMrn}`, { exact: true }) })
        .filter({ has: np.getByRole('button', { name: 'Start Prep' }) })
        .last();
      await expect(card, 'staging needs the test patient in the nurse queue (waiting/called/in_prep, prep not completed)').toBeVisible({ timeout: 45_000 });
      await card.getByRole('button', { name: 'Start Prep' }).click();

      const modal = np.locator('div.fixed.inset-0').filter({ has: np.getByRole('heading', { name: 'Patient Preparation' }) });
      await expect(modal).toBeVisible();
      const field = (label: string) =>
        modal.locator('div.space-y-2').filter({ has: np.locator('label', { hasText: label }) }).locator('input').first();
      await field('Heart Rate (bpm)').fill('140');
      await modal.getByPlaceholder('Systolic').fill('80');
      await modal.getByPlaceholder('Diastolic').fill('50');
      await field('Respiratory Rate').fill('30');
      await field('O2 Saturation (%)').fill('85');
      await modal.getByPlaceholder('What brings the patient in today?').fill('Staging smoke test: shortness of breath');
      await modal.getByRole('button', { name: 'Complete Prep & Notify Doctor' }).click();

      await expect.poll(() => nurse!.net.hits('nurse-prep-rpc').length, { timeout: 20_000 }).toBeGreaterThan(0);
      await expect(np.getByText(/Critical vital signs detected \(HIGH risk\)/)).toBeVisible();
      const prepBody = nurse.net.hits('nurse-prep-rpc')[0].body as { p_vitals_data?: Record<string, unknown> };
      const nurseVitals = prepBody?.p_vitals_data;
      expect(nurseVitals, 'nurse prep payload missing p_vitals_data').toBeTruthy();
      const nurseScore = Number(nurseVitals!.news2_score);
      const nurseRisk = String(nurseVitals!.news2_risk);
      expect(nurseRisk).toBe('high');
      expect(nurseScore).toBe(12); // HR>=131 (3) + SBP<=90 (3) + RR>=25 (3) + SpO2<=91 (3)
      await closeSession(nurse);
      nurse = undefined;

      // Doctor: the consultation carries the nurse's stored vitals record as-is
      // (snake_case, separate systolic/diastolic), injected into the read.
      doctor = await openSession(browser, (net) => {
        net.addRule({
          name: 'inject-nurse-vitals',
          match: restRead('consultations', (q) => q.includes(`id=eq.${env.consultationId}`)),
          action: {
            kind: 'transform',
            mutate: (json) => {
              if (Array.isArray(json)) return json.map((r) => ({ ...r, vitals: nurseVitals }));
              if (json && typeof json === 'object') return { ...(json as object), vitals: nurseVitals };
              return json;
            },
          },
        });
      });
      await loginAs(doctor.page, env, 'doctor');
      doctor.net.assertNoProductionTraffic();
      const dp = doctor.page;
      await dp.goto(`/consultations/${env.consultationId}`);
      await expect(dp.getByRole('heading', { name: 'Consultation Workflow' })).toBeVisible({ timeout: 45_000 });
      expect(doctor.net.hits('inject-nurse-vitals').length).toBeGreaterThan(0);

      const header = await readNews2(dp, /^NEWS2:\s*\d+/);
      const sidebar = await readNews2(dp, /^Score:\s*\d+/);
      expect(header, 'consultation header NEWS2 must equal the nurse score').toEqual({ score: nurseScore, risk: nurseRisk });
      expect(sidebar, 'patient sidebar NEWS2 must equal the nurse score').toEqual({ score: nurseScore, risk: nurseRisk });
      await expect(dp.getByText(/CLINICAL DETERIORATION ALERT/)).toBeVisible();
    } finally {
      await closeSession(nurse);
      await closeSession(doctor);
    }
  });
});
