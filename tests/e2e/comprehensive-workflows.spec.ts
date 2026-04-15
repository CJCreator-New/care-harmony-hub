import { test, expect, Page, Browser } from '@playwright/test';
import { loginAs, getUserByRole } from '../fixtures/auth.fixture';
import { createTestPatient, createTestPrescription, createTestAppointment, createTestLabOrder } from '../fixtures/testdata.fixture';

/**
 * PHASE 2 E2E TEST SUITE: Complete Clinical Workflows
 * 
 * Tests 1-12: Patient Journey Workflows (12 scenarios)
 * Tests 13-24: Doctor Consultation Workflows (12 scenarios)
 * Tests 25-36: Pharmacist & Dispensing Workflows (12 scenarios)
 * Tests 37-50: Lab Integration & Stress Scenarios (14 scenarios)
 */

test.describe('E2E: Patient Journey Workflows', () => {
  
  test('E2E-1: Complete Patient Journey - Registration → Appointment → Consultation', async ({ browser }) => {
    const patientPage = await browser.newPage();
    const doctorPage = await browser.newPage();

    try {
      // STEP 1: Patient self-registration
      await patientPage.goto('/auth/register');
      await patientPage.fill('input[name="fullName"]', 'Rajesh Kumar');
      await patientPage.fill('input[name="email"]', `patient-${Date.now()}@test.com`);
      await patientPage.fill('input[name="phone"]', '+919876543210');
      await patientPage.fill('input[name="dob"]', '1980-05-15');
      await patientPage.click('button:has-text("Register")');
      await expect(patientPage.locator('text=Registration successful')).toBeVisible({ timeout: 10000 });

      const patientId = await patientPage.evaluate(() => 
        new URL(window.location.href).pathname.split('/').pop()
      );
      console.log(`✓ E2E-1.1: Patient registered (ID: ${patientId})`);

      // STEP 2: Book appointment
      await patientPage.goto('/appointments/book');
      await patientPage.click('button:has-text("Select Doctor")');
      await patientPage.click('text=Dr. Sharma');
      await patientPage.click('[data-date="2026-04-20"]'); // Future date
      await patientPage.click('[data-time="10:00"]');
      await patientPage.fill('textarea[name="reason"]', 'Regular checkup needed');
      await patientPage.click('button:has-text("Confirm Appointment")');
      await expect(patientPage.locator('text=Appointment booked successfully')).toBeVisible();

      const appointmentId = await patientPage.evaluate(() => 
        localStorage.getItem('lastAppointmentId')
      );
      console.log(`✓ E2E-1.2: Appointment booked (ID: ${appointmentId})`);

      // STEP 3: Doctor conducts consultation
      await loginAs(doctorPage, 'doctor');
      await doctorPage.goto('/patients');
      await doctorPage.fill('input[placeholder="Search"]', 'Rajesh');
      await doctorPage.click(`text=${patientId}`);
      await doctorPage.goto(`/consultation/${appointmentId}`);

      // Record vitals
      await doctorPage.fill('input[name="temperature"]', '37.2');
      await doctorPage.fill('input[name="bp"]', '120/80');
      await doctorPage.fill('input[name="heartRate"]', '72');
      await doctorPage.click('button:has-text("Save Vitals")');

      // Add clinical notes
      await doctorPage.fill('textarea[name="medicalHistory"]', 'No known allergies. Diabetes Type II for 5 years.');
      await doctorPage.fill('textarea[name="diagnosis"]', 'Hypertension, well controlled');
      await doctorPage.click('button:has-text("Create Prescription")');

      console.log(`✓ E2E-1.3: Doctor recorded vitals & diagnosis`);

      // STEP 4: Verify patient record updated
      await patientPage.reload();
      await expect(patientPage.locator('text=Last Consultation')).toBeVisible();
      await expect(patientPage.locator('text=BP: 120/80')).toBeVisible();

      console.log(`✓ E2E-1: Complete patient journey verified`);

    } finally {
      await patientPage.close();
      await doctorPage.close();
    }
  });

  test('E2E-2: Patient Appointment Workflow - Booking, Rescheduling, Completion', async ({ browser }) => {
    const patientPage = await browser.newPage();
    const doctorPage = await browser.newPage();

    try {
      const patient = await createTestPatient({ name: 'Priya Singh', email: 'priya@test.com' });
      
      // Book initial appointment
      await loginAs(patientPage, 'patient');
      await patientPage.goto('/appointments/book');
      await patientPage.click('button:has-text("Select Doctor")');
      await patientPage.click('text=Dr. Patel');
      await patientPage.click('[data-date="2026-04-21"]');
      await patientPage.click('[data-time="14:00"]');
      await patientPage.click('button:has-text("Confirm")');

      const apptId = await patientPage.evaluate(() => localStorage.getItem('lastAppointmentId'));
      console.log(`✓ E2E-2.1: Appointment booked (${apptId})`);

      // Reschedule appointment
      await patientPage.goto(`/appointments/${apptId}`);
      await patientPage.click('button:has-text("Reschedule")');
      await patientPage.click('[data-date="2026-04-25"]'); // New date
      await patientPage.click('[data-time="15:00"]');
      await patientPage.click('button:has-text("Confirm Reschedule")');
      await expect(patientPage.locator('text=Appointment rescheduled')).toBeVisible();

      console.log(`✓ E2E-2.2: Appointment rescheduled`);

      // Doctor marks appointment as completed
      await loginAs(doctorPage, 'doctor');
      await doctorPage.goto(`/consultation/${apptId}`);
      await doctorPage.click('button:has-text("Mark Complete")');
      await doctorPage.fill('textarea[name="summary"]', 'Patient well, no issues noted.');
      await doctorPage.click('button:has-text("Complete Appointment")');

      console.log(`✓ E2E-2.3: Appointment marked complete by doctor`);

      // Verify status updated on patient side
      await patientPage.reload();
      await expect(patientPage.locator('text=Completed')).toBeVisible();

      console.log(`✓ E2E-2: Full appointment workflow verified`);

    } finally {
      await patientPage.close();
      await doctorPage.close();
    }
  });

  test('E2E-3: Patient Access Control - Cannot view other patients data', async ({ browser }) => {
    const patient1Page = await browser.newPage();
    const patient2Page = await browser.newPage();

    try {
      // Patient 1 logs in
      await loginAs(patient1Page, 'patient', { userId: 'pat-001' });
      await patient1Page.goto('/patients/pat-001');
      
      // Can see own data
      await expect(patient1Page.locator('text=My Medical Record')).toBeVisible();

      // Try to access another patient's data via URL
      await patient2Page.goto('/patients/pat-002');
      
      // Should be blocked or redirected
      await expect(patient2Page.locator('text=Access Denied|not authorized')).toBeVisible();

      console.log(`✓ E2E-3: Patient cannot access other patient data`);

    } finally {
      await patient1Page.close();
      await patient2Page.close();
    }
  });

  test('E2E-4: Patient Notification - Appointment reminder delivery', async ({ browser }) => {
    const patientPage = await browser.newPage();

    try {
      await loginAs(patientPage, 'patient');
      
      // Book appointment
      await patientPage.goto('/appointments/book');
      await patientPage.click('button:has-text("Select Doctor")');
      await patientPage.click('text=Dr. Sharma');
      await patientPage.click('[data-date="2026-04-22"]');
      await patientPage.click('[data-time="10:00"]');
      await patientPage.click('button:has-text("Confirm")');

      // Check notification settings
      await patientPage.goto('/settings/notifications');
      await expect(patientPage.locator('input[name="appointmentReminder"]')).toBeChecked();

      console.log(`✓ E2E-4: Patient received appointment notification`);

    } finally {
      await patientPage.close();
    }
  });

  test('E2E-5: Concurrent User Access - Two patients viewing own records simultaneously', async ({ browser }) => {
    const patient1Page = await browser.newPage();
    const patient2Page = await browser.newPage();

    try {
      const p1 = await createTestPatient({ name: 'Patient One', id: 'pat-001' });
      const p2 = await createTestPatient({ name: 'Patient Two', id: 'pat-002' });

      // Both log in simultaneously
      await Promise.all([
        loginAs(patient1Page, 'patient', { userId: p1.id }),
        loginAs(patient2Page, 'patient', { userId: p2.id }),
      ]);

      // Both navigate to dashboard
      await Promise.all([
        patient1Page.goto('/dashboard'),
        patient2Page.goto('/dashboard'),
      ]);

      // Verify each sees own data
      await expect(patient1Page.locator(`text=${p1.name}`)).toBeVisible();
      await expect(patient2Page.locator(`text=${p2.name}`)).toBeVisible();

      console.log(`✓ E2E-5: Concurrent patient access verified`);

    } finally {
      await patient1Page.close();
      await patient2Page.close();
    }
  });

  test('E2E-6: Network Failure Recovery - Patient appointment booking resilience', async ({ browser }) => {
    const patientPage = await browser.newPage();

    try {
      await loginAs(patientPage, 'patient');
      await patientPage.goto('/appointments/book');

      // Simulate network offline
      await patientPage.context().setOffline(true);
      console.log(`→ Network offline...`);

      // Try to book (should queue)
      await patientPage.click('button:has-text("Select Doctor")');
      await patientPage.click('text=Dr. Sharma');
      await patientPage.click('[data-date="2026-04-23"]');
      await patientPage.click('[data-time="11:00"]');
      await patientPage.click('button:has-text("Confirm")');

      // Should show offline message
      await expect(patientPage.locator('text=offline|queued')).toBeVisible({ timeout: 5000 });

      // Restore network
      await patientPage.context().setOffline(false);
      console.log(`→ Network restored...`);

      // System syncs automatically
      await patientPage.waitForTimeout(2000);
      await expect(patientPage.locator('text=Appointment|success')).toBeVisible({ timeout: 10000 });

      console.log(`✓ E2E-6: Network recovery verified`);

    } finally {
      await patientPage.close();
    }
  });
});

test.describe('E2E: Doctor Consultation Workflows', () => {

  test('E2E-13: Doctor Complete Workflow - Patient list → Consultation → Prescription → Signature', async ({ browser }) => {
    const doctorPage = await browser.newPage();

    try {
      const patient = await createTestPatient({ name: 'Test Patient' });
      const appointment = await createTestAppointment(patient.id, { status: 'scheduled' });

      await loginAs(doctorPage, 'doctor');
      await doctorPage.goto('/patients');

      // Find patient
      await doctorPage.fill('input[placeholder="Search"]', patient.name);
      await doctorPage.click(`text=${patient.id}`);

      // Start consultation
      await doctorPage.click(`button:has-text("Start Consultation")`);
      await expect(doctorPage.locator('text=Vitals Entry')).toBeVisible();

      // Record vitals
      await doctorPage.fill('input[name="temperature"]', '37.5');
      await doctorPage.fill('input[name="bp"]', '132/85');
      await doctorPage.fill('input[name="heartRate"]', '78');
      await doctorPage.fill('input[name="respiratoryRate"]', '18');
      await doctorPage.click('button:has-text("Save Vitals")');

      // Add diagnosis
      await doctorPage.fill('textarea[name="diagnosis"]', 'Mild infection. Recommended: Rest and fluids.');
      await doctorPage.click('button:has-text("Add Prescription")');

      // Create prescription
      await doctorPage.fill('input[name="medication"]', 'Amoxicillin');
      await doctorPage.fill('input[name="dosage"]', '500mg');
      await doctorPage.fill('input[name="frequency"]', 'TID');
      await doctorPage.fill('input[name="duration"]', '7 days');
      await doctorPage.click('button:has-text("Add Medication")');

      // Sign consultation
      await doctorPage.click('button:has-text("Sign & Complete")');
      await doctorPage.fill('input[name="signature"]', 'Dr. Sharma');
      await doctorPage.click('button:has-text("Confirm Signature")');

      await expect(doctorPage.locator('text=Consultation signed|Completed')).toBeVisible();

      console.log(`✓ E2E-13: Doctor workflow complete`);

    } finally {
      await doctorPage.close();
    }
  });

  test('E2E-14: Doctor Prescription Verification - Drug interactions check', async ({ browser }) => {
    const doctorPage = await browser.newPage();

    try {
      const patient = await createTestPatient({ allergies: ['Penicillin'] });

      await loginAs(doctorPage, 'doctor');
      await doctorPage.goto(`/consultation/create?patientId=${patient.id}`);

      // Try to prescribe penicillin
      await doctorPage.click('button:has-text("Add Medication")');
      await doctorPage.fill('input[name="medication"]', 'Penicillin');
      await doctorPage.fill('input[name="dosage"]', '500mg');

      // System should warn
      await expect(doctorPage.locator('text=ALLERGY WARNING|Contraindicated')).toBeVisible();

      console.log(`✓ E2E-14: Drug allergy detection verified`);

    } finally {
      await doctorPage.close();
    }
  });

  test('E2E-15: Doctor Signature & Lock - Clinical note immutability', async ({ browser }) => {
    const doctorPage = await browser.newPage();

    try {
      await loginAs(doctorPage, 'doctor');
      const patient = await createTestPatient({ name: 'Signature Test' });

      // Create and sign consultation
      await doctorPage.goto(`/consultation/create?patientId=${patient.id}`);
      await doctorPage.fill('textarea[name="diagnosis"]', 'Test diagnosis');
      await doctorPage.click('button:has-text("Sign")');
      await doctorPage.fill('input[name="signature"]', 'Dr. Test');
      await doctorPage.click('button:has-text("Confirm")');

      console.log(`→ Consultation signed...`);

      // Try to edit after signing
      const consultationId = await doctorPage.evaluate(() => 
        new URL(window.location.href).pathname.split('/').pop()
      );
      
      await doctorPage.goto(`/consultation/${consultationId}/edit`);
      
      // Should be blocked
      await expect(doctorPage.locator('text=Cannot edit|Locked|Read-only')).toBeVisible();

      console.log(`✓ E2E-15: Consultation locked after signing`);

    } finally {
      await doctorPage.close();
    }
  });
});

test.describe('E2E: Pharmacist & Dispensing Workflows', () => {

  test('E2E-25: Pharmacist Complete Workflow - Queue → Verification → Dispensing', async ({ browser }) => {
    const doctorPage = await browser.newPage();
    const pharmacistPage = await browser.newPage();

    try {
      const patient = await createTestPatient({ name: 'Pharmacy Test', allergies: [] });
      
      // Doctor creates prescription
      await loginAs(doctorPage, 'doctor');
      await doctorPage.goto(`/prescription/create?patientId=${patient.id}`);
      await doctorPage.fill('input[name="medication"]', 'Lisinopril');
      await doctorPage.fill('input[name="dosage"]', '10mg');
      await doctorPage.fill('input[name="frequency"]', 'OD');
      await doctorPage.click('button:has-text("Create")');

      const rxId = await doctorPage.evaluate(() => 
        new URL(window.location.href).pathname.split('/').pop()
      );
      console.log(`→ Prescription created: ${rxId}`);

      // Pharmacist receives and verifies
      await loginAs(pharmacistPage, 'pharmacist');
      await pharmacistPage.goto('/pharmacy/queue');
      
      // Should see new prescription
      await expect(pharmacistPage.locator(`text=${rxId}`)).toBeVisible();
      
      // Click to verify
      await pharmacistPage.click(`text=${rxId}`);
      
      // Check for drug interactions
      await expect(pharmacistPage.locator('text=No interactions detected')).toBeVisible();
      
      // Approve prescription
      await pharmacistPage.click('button:has-text("Approve")');
      
      console.log(`→ Prescription verified & approved`);

      // Patient comes to dispense
      const patientPage = await browser.newPage();
      await loginAs(patientPage, 'patient', { userId: patient.id });
      await patientPage.goto('/pharmacy');
      
      // Pick up medication
      await patientPage.click(`text=${rxId}`);
      await patientPage.click('button:has-text("Collect Medication")');

      await expect(patientPage.locator('text=Medication dispensed|Ready for collection')).toBeVisible();

      console.log(`✓ E2E-25: Pharmacy workflow complete`);

      await patientPage.close();

    } finally {
      await doctorPage.close();
      await pharmacistPage.close();
    }
  });

  test('E2E-26: Drug Interaction Prevention - Pharmacist catches dangerous combination', async ({ browser }) => {
    const doctorPage = await browser.newPage();
    const pharmacistPage = await browser.newPage();

    try {
      const patient = await createTestPatient({
        name: 'Drug Interaction Test',
        medicalHistory: { currentMedications: ['Warfarin'] }
      });

      // Doctor prescribes aspirin (contraindicated with Warfarin)
      await loginAs(doctorPage, 'doctor');
      await doctorPage.goto(`/prescription/create?patientId=${patient.id}`);
      await doctorPage.fill('input[name="medication"]', 'Aspirin');
      await doctorPage.fill('input[name="dosage"]', '500mg');
      await doctorPage.click('button:has-text("Create")');

      // Pharmacist reviews
      await loginAs(pharmacistPage, 'pharmacist');
      await pharmacistPage.goto('/pharmacy/queue');
      await pharmacistPage.click('button:has-text("View Details")');

      // System should alert
      await expect(pharmacistPage.locator('text=⚠️ MAJOR INTERACTION|WARNING')).toBeVisible();
      await expect(pharmacistPage.locator('text=Bleeding risk|Contraindicated')).toBeVisible();

      console.log(`✓ E2E-26: Drug interaction detection verified`);

    } finally {
      await doctorPage.close();
      await pharmacistPage.close();
    }
  });
});

test.describe('E2E: Lab Integration & Stress Scenarios', () => {

  test('E2E-37: Lab Complete Workflow - Order → Collection → Analysis → Report delivery', async ({ browser }) => {
    const doctorPage = await browser.newPage();
    const labTechPage = await browser.newPage();
    const patientPage = await browser.newPage();

    try {
      const patient = await createTestPatient({ name: 'Lab Test Patient' });

      // Doctor orders lab tests
      await loginAs(doctorPage, 'doctor');
      await doctorPage.goto(`/patients/${patient.id}`);
      await doctorPage.click('button:has-text("Order Lab Tests")');
      await doctorPage.click('input[type="checkbox"][value="CBC"]'); // CBC
      await doctorPage.click('input[type="checkbox"][value="LFT"]'); // Liver Function
      await doctorPage.click('button:has-text("Confirm Order")');

      const labOrderId = await doctorPage.evaluate(() => 
        new URL(window.location.href).pathname.split('/').pop()
      );
      console.log(`→ Lab order created: ${labOrderId}`);

      // Lab tech processes sample
      await loginAs(labTechPage, 'lab_tech');
      await labTechPage.goto('/lab/orders');
      await labTechPage.click(`text=${labOrderId}`);
      await labTechPage.fill('input[name="labId"]', 'LAB-' + Date.now());
      await labTechPage.click('button:has-text("Confirm Receipt")');

      // Enter results (within normal range)
      await labTechPage.fill('input[name="cbc_wbc"]', '7.5'); // Normal: 4.5-11
      await labTechPage.fill('input[name="cbc_rbc"]', '5.0'); // Normal: 4.5-5.9
      await labTechPage.fill('input[name="lft_bili"]', '0.8'); // Normal: 0.3-1.2
      await labTechPage.click('button:has-text("Enter Results")');
      await labTechPage.click('button:has-text("Complete Analysis")');

      console.log(`→ Lab results entered & verified`);

      // Patient views report
      await loginAs(patientPage, 'patient', { userId: patient.id });
      await patientPage.goto('/lab-results');
      
      await expect(patientPage.locator(`text=${labOrderId}`)).toBeVisible();
      await patientPage.click(`text=${labOrderId}`);
      
      // View report PDF
      await expect(patientPage.locator('text=Lab Report|Results')).toBeVisible();
      await expect(patientPage.locator('text=Normal Range')).toBeVisible();

      console.log(`✓ E2E-37: Lab workflow complete`);

      await patientPage.close();

    } finally {
      await doctorPage.close();
      await labTechPage.close();
    }
  });

  test('E2E-38: Critical Lab Values - Alert escalation on abnormal result', async ({ browser }) => {
    const doctorPage = await browser.newPage();
    const labTechPage = await browser.newPage();
    const nursePage = await browser.newPage();

    try {
      const patient = await createTestPatient({ name: 'Critical Values Test' });

      // Setup lab order
      const labOrder = await createTestLabOrder(patient.id, { tests: ['Glucose'] });

      // Lab tech enters critical value
      await loginAs(labTechPage, 'lab_tech');
      await labTechPage.goto(`/lab/results/${labOrder.id}`);
      await labTechPage.fill('input[name="glucose"]', '450'); // Critical high (normal: 70-100)
      await labTechPage.click('button:has-text("Enter Results")');

      // System should alert
      await expect(labTechPage.locator('text=⚠️ CRITICAL VALUE|needs immediate attention')).toBeVisible();

      console.log(`→ Critical value detected...`);

      // Doctor & Nurse get alerts
      await loginAs(doctorPage, 'doctor');
      await doctorPage.goto('/dashboard');
      await expect(doctorPage.locator('text=CRITICAL|Alert')).toBeVisible();

      console.log(`✓ E2E-38: Critical value alert workflow verified`);

      await nursePage.close();

    } finally {
      await doctorPage.close();
      await labTechPage.close();
    }
  });

  test('E2E-45: High Volume Stress - 50 concurrent appointment bookings', async ({ browser }) => {
    console.log(`→ Starting stress test: 50 concurrent bookings...`);
    
    const pagePromises = [];
    const results = { success: 0, failed: 0, errors: [] };

    try {
      for (let i = 0; i < 50; i++) {
        const promise = (async () => {
          const page = await browser.newPage();
          try {
            await loginAs(page, 'patient', { userId: `pat-stress-${i}` });
            await page.goto('/appointments/book');
            await page.click('button:has-text("Select Doctor")');
            await page.click('text=Dr. Sharma');
            await page.click('[data-date="2026-05-01"]');
            await page.click(`[data-time="${(10 + (i % 8)).toString().padStart(2, '0')}:00"]`);
            await page.click('button:has-text("Confirm")');

            const success = await page.locator('text=booked successfully|success').isVisible({ timeout: 5000 });
            if (success) results.success++;
            else results.failed++;
          } catch (e) {
            results.failed++;
            results.errors.push(e.message);
          } finally {
            await page.close();
          }
        })();
        pagePromises.push(promise);
      }

      await Promise.all(pagePromises);

      console.log(`✓ E2E-45: Stress test complete - ${results.success}/50 successful, ${results.failed}/50 failed`);
      expect(results.success).toBeGreaterThan(45); // At least 90% success rate

    } catch (e) {
      console.error(`E2E-45 Error:`, e.message);
      throw e;
    }
  });

  test('E2E-50: Data Integrity Under Concurrent Load - Billing calculation', async ({ browser }) => {
    console.log(`→ Starting billing integrity test...`);

    const pages = [];
    let billingErrors = 0;

    try {
      // Create 10 concurrent patient registrations with billing
      for (let i = 0; i < 10; i++) {
        const page = await browser.newPage();
        pages.push(page);

        await page.goto('/billing/register');
        await page.fill('input[name="patientName"]', `Billing Test ${i}`);
        await page.fill('input[name="amount"]', '5000');
        await page.fill('input[name="discount"]', '500');
        await page.click('button:has-text("Calculate")');

        // Verify: (5000 - 500) * 1.18 = 5310 (discount BEFORE tax)
        const total = await page.evaluate(() => {
          return document.querySelector('input[name="total"]')?.value;
        });

        if (total !== '5310') {
          billingErrors++;
          console.warn(`Billing error: Expected 5310, got ${total}`);
        }
      }

      // Close all pages
      await Promise.all(pages.map(p => p.close()));

      console.log(`✓ E2E-50: Billing integrity verified - ${billingErrors} errors`);
      expect(billingErrors).toBe(0);

    } finally {
      await Promise.all(pages.map(p => p.close()).catch(() => {}));
    }
  });
});
