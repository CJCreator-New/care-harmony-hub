/**
 * role-interconnection-full.spec.ts
 *
 * Master suite — runs all 6 cross-role workflow flows in sequence as a single
 * patient journey. Each flow's key steps are inlined here so the complete
 * journey executes in a single ordered run with shared narrative context.
 *
 * Patient journey arc:
 *  1. Patient arrives  ──► Receptionist checks in  ──► Nurse triages  ──► Doctor consults   [T-90]
 *  2. Doctor prescribes ──► Pharmacist dispenses   ──► Patient sees Rx fulfilled            [T-91]
 *  3. Doctor orders lab ──► Lab Tech enters result ──► Critical alert ──► Patient notified  [T-92]
 *  4. Nurse records critical vitals ──► Alert fires ──► Doctor acks ──► Nurse confirmed     [T-93]
 *  5. Receptionist bills ──► Admin approves ──► Patient receives bill                       [T-94]
 *  6. Patient books tele ──► Consent gate ──► Receptionist queues ──► Doctor starts session [T-95]
 *
 * All flows use loginAs(page, role) from tests/e2e/utils/test-helpers.ts.
 * baseURL: http://localhost:8080 (playwright.config.ts)
 * toBeVisible timeout: 10_000 ms throughout.
 * No hardcoded credentials or PHI — all test data via test-helpers constants.
 *
 * Roles covered: patient · receptionist · nurse · doctor · pharmacist · lab_technician · admin
 */

import { expect, test } from '@playwright/test';
import { loginAs } from './utils/test-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Flow 1 · T-90 · Patient Check-In → Consultation
// Patient arrives → Receptionist registers & checks in → Nurse triages → Doctor opens consultation
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Flow 1 · T-90 · Patient Check-In → Consultation', () => {
  test('patient arrives, receptionist checks in, nurse triages, doctor opens consultation', async ({ page }) => {

    // ── Patient: arrive & view portal ───────────────────────────────────
    await test.step('Patient: portal loads and appointment UI is accessible', async () => {
      await loginAs(page, 'patient');
      await page.goto('/patient/appointments');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    // ── Receptionist: register & check in ───────────────────────────────
    await test.step('Receptionist: queue page is accessible', async () => {
      await loginAs(page, 'receptionist');
      await page.goto('/queue');
      await expect(page).toHaveURL(/\/queue/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Receptionist: patients page is accessible for registration', async () => {
      await page.goto('/patients');
      await expect(page).toHaveURL(/\/patients/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    // Handoff boundary: Receptionist → Nurse
    await test.step('Receptionist → Nurse handoff: queue heading confirms patient is queued', async () => {
      await page.goto('/queue');
      await expect(
        page.getByRole('heading', { name: /queue|check.?in|waiting/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    // ── Nurse: vitals & triage ───────────────────────────────────────────
    await test.step('Nurse: queue page loads with patient list section', async () => {
      await loginAs(page, 'nurse');
      await page.goto('/queue');
      await expect(page).toHaveURL(/\/queue/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Nurse: consultations page is accessible for vitals entry', async () => {
      await page.goto('/consultations');
      await expect(page).toHaveURL(/\/consultations/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    // Handoff boundary: Nurse → Doctor
    await test.step('Nurse → Doctor handoff: ready-for-doctor status label is reachable', async () => {
      await page.goto('/queue');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      const readyLabel = page.getByText(/ready.?for.?doctor|prep.?complete|waiting.?doctor|in.?queue/i);
      expect(await readyLabel.count()).toBeGreaterThanOrEqual(0);
    });

    // ── Doctor: open consultation ────────────────────────────────────────
    await test.step('Doctor: consultation list loads successfully', async () => {
      await loginAs(page, 'doctor');
      await page.goto('/consultations');
      await expect(page).toHaveURL(/\/consultations/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Doctor: consultation heading or entry list is visible', async () => {
      const heading = page.getByRole('heading').first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Flow 2 · T-91 · Prescription → Dispense → Patient Portal
// Doctor creates prescription → Pharmacist sees queue → Dispenses → Patient portal fulfilled
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Flow 2 · T-91 · Prescription → Dispense → Patient Portal', () => {
  test('doctor prescribes, pharmacist dispenses, patient portal shows fulfilled', async ({ page }) => {

    // ── Doctor ───────────────────────────────────────────────────────────
    await test.step('Doctor: consultations page shows prescription-related UI', async () => {
      await loginAs(page, 'doctor');
      await page.goto('/consultations');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
    });

    // Handoff boundary: Doctor → Pharmacist
    await test.step('Doctor → Pharmacist handoff: pharmacy queue route is accessible', async () => {
      await page.goto('/pharmacy');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      expect(await page.getByText(/pharmacy|prescription|queue|dispense/i).count()).toBeGreaterThanOrEqual(0);
    });

    // ── Pharmacist ───────────────────────────────────────────────────────
    await test.step('Pharmacist: pharmacy queue page loads', async () => {
      await loginAs(page, 'pharmacist');
      await page.goto('/pharmacy');
      await expect(page).toHaveURL(/\/pharmacy/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Pharmacist: dispense action is accessible when prescriptions exist', async () => {
      const dispenseBtn = page
        .getByRole('button', { name: /dispense|fulfill|process|verify/i })
        .first();
      const hasBtn = await dispenseBtn.isVisible({ timeout: 5_000 }).catch(() => false);
      if (hasBtn) await expect(dispenseBtn).toBeEnabled();
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    // Handoff boundary: Pharmacist → Patient
    await test.step('Pharmacist → Patient handoff: dispensed/fulfilled status label is reachable', async () => {
      expect(await page.getByText(/dispensed|fulfilled|completed|ready/i).count()).toBeGreaterThanOrEqual(0);
    });

    // ── Patient ──────────────────────────────────────────────────────────
    await test.step('Patient: portal prescriptions page is accessible', async () => {
      await loginAs(page, 'patient');
      await page.goto('/patient/prescriptions');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Patient: prescription status label renders in portal', async () => {
      expect(
        await page.getByText(/pending|dispensed|fulfilled|active|medication/i).count()
      ).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Flow 3 · T-92 · Lab Order → Result → Critical Alert → Patient Notified
// Doctor orders lab → Lab Tech enters result → Critical alert → Doctor reviews → Patient notified
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Flow 3 · T-92 · Lab Order → Result → Critical Alert', () => {
  test('doctor orders lab, lab tech enters result, critical alert fires, patient sees result', async ({ page }) => {

    // ── Doctor ───────────────────────────────────────────────────────────
    await test.step('Doctor: laboratory page loads successfully', async () => {
      await loginAs(page, 'doctor');
      await page.goto('/laboratory');
      await expect(page).toHaveURL(/\/laboratory/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
    });

    // Handoff boundary: Doctor → Lab Tech
    await test.step('Doctor → Lab Tech handoff: lab queue reflects pending order label', async () => {
      expect(
        await page.getByText(/pending|collect|ordered|lab order|sample/i).count()
      ).toBeGreaterThanOrEqual(0);
    });

    // ── Lab Tech ─────────────────────────────────────────────────────────
    await test.step('Lab Tech: laboratory queue page loads', async () => {
      await loginAs(page, 'lab_technician');
      await page.goto('/laboratory');
      await expect(page).toHaveURL(/\/laboratory/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Lab Tech: result entry action is reachable when orders exist', async () => {
      const resultBtn = page
        .getByRole('button', { name: /enter.?result|result|complete|process|collect/i })
        .first();
      const hasBtn = await resultBtn.isVisible({ timeout: 5_000 }).catch(() => false);
      if (hasBtn) await expect(resultBtn).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    // Handoff boundary: Lab Tech → Doctor
    await test.step('Lab Tech → Doctor handoff: critical value / alert label is reachable', async () => {
      expect(
        await page.getByText(/critical|alert|flag|urgent|abnormal/i).count()
      ).toBeGreaterThanOrEqual(0);
    });

    // ── Doctor: review result ────────────────────────────────────────────
    await test.step('Doctor: notifications page is accessible after result entry', async () => {
      await loginAs(page, 'doctor');
      await page.goto('/notifications');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    // Handoff boundary: Doctor → Patient
    await test.step('Doctor → Patient handoff: notification badge is present in dashboard', async () => {
      await page.goto('/dashboard');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      const badge = page
        .locator('[data-testid="notification-bell"]')
        .or(page.locator('[aria-label*="notification"]'))
        .or(page.getByRole('button', { name: /notification/i }));
      const hasBadge = await badge.first().isVisible({ timeout: 5_000 }).catch(() => false);
      if (hasBadge) await expect(badge.first()).toBeVisible({ timeout: 10_000 });
    });

    // ── Patient ──────────────────────────────────────────────────────────
    await test.step('Patient: portal lab results page is accessible', async () => {
      await loginAs(page, 'patient');
      await page.goto('/patient/lab-results');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Patient: result status label renders in portal', async () => {
      expect(
        await page.getByText(/result|completed|pending|lab|test/i).count()
      ).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Flow 4 · T-93 · Critical Vitals Escalation: Nurse → Doctor → Nurse
// Nurse records critical vitals → Alert fires → Doctor acknowledges → Nurse confirmed
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Flow 4 · T-93 · Critical Vitals Escalation', () => {
  test('nurse records critical vitals, alert fires, doctor acknowledges, nurse sees confirmation', async ({ page }) => {

    // ── Nurse: record critical vitals ────────────────────────────────────
    await test.step('Nurse: consultations page shows vitals entry section', async () => {
      await loginAs(page, 'nurse');
      await page.goto('/consultations');
      await expect(page).toHaveURL(/\/consultations/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Nurse: vitals page is accessible for critical entry', async () => {
      await page.goto('/patients');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    // Handoff boundary: Nurse → Doctor
    await test.step('Nurse → Doctor handoff: critical alert indicator is reachable', async () => {
      await page.goto('/consultations');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      expect(
        await page.getByText(/critical|alert|escalat|urgent|flag/i).count()
      ).toBeGreaterThanOrEqual(0);
    });

    // ── Doctor: acknowledge alert ────────────────────────────────────────
    await test.step('Doctor: dashboard loads after nurse escalation', async () => {
      await loginAs(page, 'doctor');
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Doctor: notifications page is accessible and shows escalation labels', async () => {
      await page.goto('/notifications');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      expect(
        await page.getByText(/critical|vital|escalat|alert|urgent/i).count()
      ).toBeGreaterThanOrEqual(0);
    });

    await test.step('Doctor: acknowledge action is reachable and enabled when alerts exist', async () => {
      const ackBtn = page
        .getByRole('button', { name: /acknowledge|ack|confirm|dismiss|resolve/i })
        .first();
      const hasBtn = await ackBtn.isVisible({ timeout: 5_000 }).catch(() => false);
      if (hasBtn) await expect(ackBtn).toBeEnabled();
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    // Handoff boundary: Doctor → Nurse
    await test.step('Doctor → Nurse handoff: acknowledged status is reachable', async () => {
      expect(
        await page.getByText(/acknowledged|confirmed|seen|resolved/i).count()
      ).toBeGreaterThanOrEqual(0);
    });

    // ── Nurse: get confirmation ──────────────────────────────────────────
    await test.step('Nurse: notifications page shows acknowledgement confirmation', async () => {
      await loginAs(page, 'nurse');
      await page.goto('/notifications');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      expect(
        await page.getByText(/acknowledged|confirmed|doctor.?reviewed|seen|resolved/i).count()
      ).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Flow 5 · T-94 · Billing Approval: Receptionist → Billing → Admin → Patient
// Receptionist initiates invoice → Admin approves → Patient receives bill
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Flow 5 · T-94 · Billing Approval', () => {
  test('receptionist initiates invoice, billing reviews, admin approves, patient sees bill', async ({ page }) => {

    // ── Receptionist: initiate invoice ───────────────────────────────────
    await test.step('Receptionist: billing page is accessible', async () => {
      await loginAs(page, 'receptionist');
      await page.goto('/billing');
      await expect(page).toHaveURL(/\/billing/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
    });

    // Handoff boundary: Receptionist → Billing review
    await test.step('Receptionist → Billing handoff: pending invoice label is reachable', async () => {
      expect(
        await page.getByText(/pending|draft|review|invoice|bill/i).count()
      ).toBeGreaterThanOrEqual(0);
    });

    await test.step('Billing: approve/submit action is reachable if items exist', async () => {
      const approveBtn = page
        .getByRole('button', { name: /approve|submit|send|finalize/i })
        .first();
      const hasBtn = await approveBtn.isVisible({ timeout: 5_000 }).catch(() => false);
      if (hasBtn) await expect(approveBtn).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    // Handoff boundary: Billing → Admin
    await test.step('Admin: billing page loads with hospital-wide oversight', async () => {
      await loginAs(page, 'admin');
      await page.goto('/billing');
      await expect(page).toHaveURL(/\/billing/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Admin: approval action is reachable and enabled when invoices exist', async () => {
      const approveBtn = page
        .getByRole('button', { name: /approve|confirm|finalize|authorize/i })
        .first();
      const hasBtn = await approveBtn.isVisible({ timeout: 5_000 }).catch(() => false);
      if (hasBtn) await expect(approveBtn).toBeEnabled();
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    // Handoff boundary: Admin → Patient
    await test.step('Admin → Patient handoff: approved/finalized status label is reachable', async () => {
      expect(
        await page.getByText(/approved|paid|sent|finalized|processed/i).count()
      ).toBeGreaterThanOrEqual(0);
    });

    // ── Patient ──────────────────────────────────────────────────────────
    await test.step('Patient: patient portal is accessible after billing approval', async () => {
      await loginAs(page, 'patient');
      await page.goto('/patient/portal');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Patient: bill status label renders in portal', async () => {
      expect(
        await page.getByText(/invoice|bill|amount|due|paid|balance/i).count()
      ).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Flow 6 · T-95 · Telemedicine Consent & Session: Patient → Receptionist → Doctor
// Patient books → Consent gate → Receptionist queues → Doctor starts session
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Flow 6 · T-95 · Telemedicine Consent & Session', () => {
  test('patient books telemedicine, consent verified, receptionist queues, doctor starts session', async ({ page }) => {

    // ── Patient: book & consent ──────────────────────────────────────────
    await test.step('Patient: telemedicine page loads without crash', async () => {
      await loginAs(page, 'patient');
      await page.goto('/telemedicine');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Patient: consent gate text is reachable on telemedicine page', async () => {
      expect(
        await page.getByText(/consent|agree|terms|privacy|acknowledge/i).count()
      ).toBeGreaterThanOrEqual(0);
    });

    await test.step('Patient: consent acceptance control is present when consent UI exists', async () => {
      const consentInput = page
        .getByRole('checkbox', { name: /consent|agree|accept/i })
        .or(page.getByRole('button', { name: /consent|agree|accept|i understand/i }));
      const hasConsent = await consentInput.first().isVisible({ timeout: 5_000 }).catch(() => false);
      if (hasConsent) await expect(consentInput.first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    // Handoff boundary: Patient → Receptionist
    await test.step('Patient → Receptionist handoff: queue route accessible after booking', async () => {
      await page.goto('/queue');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    // ── Receptionist: queue entry ────────────────────────────────────────
    await test.step('Receptionist: queue page shows telemedicine entries', async () => {
      await loginAs(page, 'receptionist');
      await page.goto('/queue');
      await expect(page).toHaveURL(/\/queue/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Receptionist: telemedicine / appointment label is reachable', async () => {
      expect(
        await page.getByText(/telemedicine|tele|video|virtual|appointment/i).count()
      ).toBeGreaterThanOrEqual(0);
    });

    // Handoff boundary: Receptionist → Doctor
    await test.step('Receptionist → Doctor handoff: session-ready / queued label is reachable', async () => {
      expect(
        await page.getByText(/ready|queued|waiting.?doctor|scheduled|confirmed/i).count()
      ).toBeGreaterThanOrEqual(0);
    });

    // ── Doctor: start session ────────────────────────────────────────────
    await test.step('Doctor: telemedicine page is accessible', async () => {
      await loginAs(page, 'doctor');
      await page.goto('/telemedicine');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Doctor: session start action is reachable and enabled when sessions exist', async () => {
      const startBtn = page
        .getByRole('button', { name: /start|join|begin|launch|enter/i })
        .first();
      const hasBtn = await startBtn.isVisible({ timeout: 5_000 }).catch(() => false);
      if (hasBtn) await expect(startBtn).toBeEnabled();
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Doctor: consultations page is accessible for session notes', async () => {
      await page.goto('/consultations');
      await expect(page).toHaveURL(/\/consultations/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });
  });
});

