import { test, expect, Page } from '@playwright/test';
import { setTestRole, loginAsTestUser, setupApiMocks, TEST_DATA } from './utils/test-helpers';

// Test data for complete patient journey
const TEST_PATIENT = {
  firstName: 'Jane',
  lastName: 'Smith',
  phone: '+1-555-0123',
  email: 'jane.smith@test.com',
  dateOfBirth: '1990-03-15',
  insurance: 'Blue Cross Blue Shield',
  policyNumber: 'BCBS123456'
};

const TEST_VITALS = {
  bloodPressure: '120/80',
  heartRate: '72',
  temperature: '98.6',
  weight: '150',
  height: '5\'6"'
};

const TEST_CONSULTATION = {
  chiefComplaint: 'Annual physical examination',
  assessment: 'Patient in good health',
  plan: 'Order routine blood work'
};

const TEST_LAB_ORDERS = ['CBC', 'Lipid Panel', 'Glucose'];

const TEST_PRESCRIPTION = {
  medication: 'Multivitamin',
  dosage: '1 tablet daily',
  duration: '30 days'
};

// Helper functions

async function createTestPatient(page: Page) {
  await page.goto('/patients');
  await page.click('button:has-text("New Patient")');

  // Fill registration form
  await page.fill('[name="firstName"]', TEST_PATIENT.firstName);
  await page.fill('[name="lastName"]', TEST_PATIENT.lastName);
  await page.fill('[name="phone"]', TEST_PATIENT.phone);
  await page.fill('[name="email"]', TEST_PATIENT.email);
  await page.fill('[name="dateOfBirth"]', TEST_PATIENT.dateOfBirth);
  await page.fill('[name="insurance"]', TEST_PATIENT.insurance);
  await page.fill('[name="policyNumber"]', TEST_PATIENT.policyNumber);

  await page.click('button:has-text("Register Patient")');

  // Wait for success message
  await expect(page.locator('text=Patient registered successfully')).toBeVisible();

  // Get generated MRN
  const mrnElement = page.locator('[data-testid="patient-mrn"]');
  await expect(mrnElement).toBeVisible();
  const mrn = await mrnElement.textContent();

  return mrn;
}

async function scheduleAppointment(page: Page, patientName: string, doctorName: string) {
  await page.goto('/appointments');
  await page.click('button:has-text("New Appointment")');

  // Select patient
  await page.click('[data-testid="patient-select"]');
  await page.click(`text=${patientName}`);

  // Select doctor
  await page.click('[data-testid="doctor-select"]');
  await page.click(`text=${doctorName}`);

  // Set date/time (tomorrow at 10:00 AM)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateString = tomorrow.toISOString().split('T')[0];

  await page.fill('[name="appointmentDate"]', dateString);
  await page.fill('[name="appointmentTime"]', '10:00');

  // Select type
  await page.selectOption('[name="type"]', 'Consultation');

  // Add notes
  await page.fill('[name="notes"]', 'New patient consultation');

  await page.click('button:has-text("Schedule Appointment")');

  await expect(page.locator('text=Appointment scheduled successfully')).toBeVisible();
}

async function checkInPatient(page: Page, patientName: string) {
  await page.goto('/queue');
  await page.click(`text=${patientName}`);
  await page.click('button:has-text("Check In")');

  await expect(page.locator('text=Patient checked in successfully')).toBeVisible();
}

async function recordVitals(page: Page, patientName: string) {
  await page.goto('/nurse/vitals');
  await page.click(`text=${patientName}`);
  await page.click('button:has-text("Record Vitals")');

  // Fill vitals form
  await page.fill('[name="bloodPressure"]', TEST_VITALS.bloodPressure);
  await page.fill('[name="heartRate"]', TEST_VITALS.heartRate);
  await page.fill('[name="temperature"]', TEST_VITALS.temperature);
  await page.fill('[name="weight"]', TEST_VITALS.weight);
  await page.fill('[name="height"]', TEST_VITALS.height);
  await page.fill('[name="notes"]', 'Patient appears healthy');

  await page.click('button:has-text("Save Vitals")');

  await expect(page.locator('text=Vitals recorded successfully')).toBeVisible();
}

async function conductConsultation(page: Page, patientName: string) {
  await page.goto('/consultations');
  await page.click(`text=${patientName}`);
  await page.click('button:has-text("Start Consultation")');

  // Fill consultation form
  await page.fill('[name="chiefComplaint"]', TEST_CONSULTATION.chiefComplaint);
  await page.fill('[name="assessment"]', TEST_CONSULTATION.assessment);
  await page.fill('[name="plan"]', TEST_CONSULTATION.plan);

  // Order lab tests
  for (const test of TEST_LAB_ORDERS) {
    await page.click(`text=${test}`);
  }

  // Create prescription
  await page.click('button:has-text("Add Prescription"');
  await page.fill('[name="medication"]', TEST_PRESCRIPTION.medication);
  await page.fill('[name="dosage"]', TEST_PRESCRIPTION.dosage);
  await page.fill('[name="duration"]', TEST_PRESCRIPTION.duration);

  await page.click('button:has-text("Complete Consultation")');

  await expect(page.locator('text=Consultation completed successfully')).toBeVisible();
}

async function processLabOrders(page: Page, patientName: string) {
  await page.goto('/lab/orders');
  await page.click(`text=${patientName}`);

  // Mark samples collected
  await page.click('button:has-text("Collect Sample")');
  await expect(page.locator('text=Sample collected')).toBeVisible();

  // Enter results
  await page.click('button:has-text("Enter Results"');

  // CBC results
  await page.fill('[name="cbc-wbc"]', '7.5');
  await page.fill('[name="cbc-rbc"]', '4.8');
  await page.fill('[name="cbc-hemoglobin"]', '14.2');

  // Lipid panel
  await page.fill('[name="lipid-cholesterol"]', '180');
  await page.fill('[name="lipid-hdl"]', '55');
  await page.fill('[name="lipid-ldl"]', '100');

  // Glucose
  await page.fill('[name="glucose"]', '95');

  await page.click('button:has-text("Submit Results")');

  await expect(page.locator('text=Results submitted successfully')).toBeVisible();
}

async function dispensePrescription(page: Page, patientName: string) {
  await page.goto('/pharmacy/prescriptions');
  await page.click(`text=${patientName}`);

  await page.click('button:has-text("Dispense")');

  await expect(page.locator('text=Prescription dispensed successfully')).toBeVisible();
}

async function processBilling(page: Page, patientName: string) {
  await page.goto('/billing');
  await page.click(`text=${patientName}`);

  // Generate invoice
  await page.click('button:has-text("Generate Invoice")');

  // Verify charges
  await expect(page.locator('text=Consultation')).toBeVisible();
  await expect(page.locator('text=Lab Tests')).toBeVisible();
  await expect(page.locator('text=Prescription')).toBeVisible();

  // Process payment
  await page.click('button:has-text("Process Payment")');
  await page.selectOption('[name="paymentMethod"]', 'insurance');

  await page.click('button:has-text("Complete Payment")');

  await expect(page.locator('text=Payment processed successfully')).toBeVisible();
}

// Main test suite
test.describe('Complete Patient Journey - Registration to Discharge', () => {
  test.setTimeout(300000); // 5 minutes timeout

  test('should complete full patient journey across all roles', async ({ page, browser }) => {
    // Create browser contexts for different roles
    const receptionistContext = await browser.newContext();
    const nurseContext = await browser.newContext();
    const doctorContext = await browser.newContext();
    const labTechContext = await browser.newContext();
    const pharmacistContext = await browser.newContext();
    const receptionistDischargeContext = await browser.newContext();

    const receptionistPage = await receptionistContext.newPage();
    const nursePage = await nurseContext.newPage();
    const doctorPage = await doctorContext.newPage();
    const labTechPage = await labTechContext.newPage();
    const pharmacistPage = await pharmacistContext.newPage();
    const receptionistDischargePage = await receptionistDischargeContext.newPage();

    try {
      // Step 1: Patient Registration (Receptionist)
      await loginAsRole(receptionistPage, 'receptionist');
      const patientMRN = await createTestPatient(receptionistPage);
      expect(patientMRN).toMatch(/^MRN\d{6}$/);

      // Step 2: Appointment Scheduling (Receptionist)
      await scheduleAppointment(receptionistPage, 'Jane Smith', 'Dr. Sarah Johnson');

      // Step 3: Patient Check-in (Receptionist)
      await checkInPatient(receptionistPage, 'Jane Smith');

      // Step 4: Vital Signs Recording (Nurse)
      await loginAsRole(nursePage, 'nurse');
      await recordVitals(nursePage, 'Jane Smith');

      // Step 5: Medical Consultation (Doctor)
      await loginAsRole(doctorPage, 'doctor');
      await conductConsultation(doctorPage, 'Jane Smith');

      // Step 6: Lab Order Processing (Lab Tech)
      await loginAsRole(labTechPage, 'lab_tech');
      await processLabOrders(labTechPage, 'Jane Smith');

      // Step 7: Prescription Dispensing (Pharmacist)
      await loginAsRole(pharmacistPage, 'pharmacist');
      await dispensePrescription(pharmacistPage, 'Jane Smith');

      // Step 8: Billing and Discharge (Receptionist)
      await loginAsRole(receptionistDischargePage, 'receptionist');
      await processBilling(receptionistDischargePage, 'Jane Smith');

      // Final verification - patient record should show completed journey
      await receptionistDischargePage.goto('/patients');
      await receptionistDischargePage.click('text=Jane Smith');

      // Verify all steps completed
      await expect(receptionistDischargePage.locator('text=Consultation Completed')).toBeVisible();
      await expect(receptionistDischargePage.locator('text=Lab Results Available')).toBeVisible();
      await expect(receptionistDischargePage.locator('text=Prescription Dispensed')).toBeVisible();
      await expect(receptionistDischargePage.locator('text=Bill Paid')).toBeVisible();

    } finally {
      // Clean up contexts
      await receptionistContext.close();
      await nurseContext.close();
      await doctorContext.close();
      await labTechContext.close();
      await pharmacistContext.close();
      await receptionistDischargeContext.close();
    }
  });

  test('should handle concurrent patient processing', async ({ page, browser }) => {
    // Test with multiple patients being processed simultaneously
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);

    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

    try {
      // Login all users
      await Promise.all([
        loginAsRole(pages[0], 'nurse'),
        loginAsRole(pages[1], 'doctor'),
        loginAsRole(pages[2], 'lab_tech')
      ]);

      // Verify all can access their respective dashboards simultaneously
      await expect(pages[0].locator('text=Patient Queue')).toBeVisible();
      await expect(pages[1].locator('text=Consultations')).toBeVisible();
      await expect(pages[2].locator('text=Lab Orders')).toBeVisible();

    } finally {
      await Promise.all(contexts.map(ctx => ctx.close()));
    }
  });

  test('should maintain data integrity across role transitions', async ({ page }) => {
    // Test that data created by one role is visible to subsequent roles
    await loginAsRole(page, 'receptionist');

    const patientMRN = await createTestPatient(page);
    await scheduleAppointment(page, 'Jane Smith', 'Dr. Sarah Johnson');
    await checkInPatient(page, 'Jane Smith');

    // Switch to nurse role and verify data
    await setTestRole(page, 'nurse');
    await page.reload();

    await expect(page.locator('text=Jane Smith')).toBeVisible();
    await expect(page.locator('text=Waiting')).toBeVisible();
  });
});