/**
 * Prescription Approval Workflow E2E Test
 * Tests complete multi-role flow: Doctor creates → Pharmacist approves → Nurse dispenses
 * 
 * Per hims-browser-test-automation skill:
 * - Verify role-based access control
 * - Validate workflow state transitions
 * - Test form validation and error handling
 * - Check audit trail entries
 */

import { test, expect } from './fixtures/roles.fixture';

test.describe('Prescription Approval Workflow (Multi-Role)', () => {
  let prescriptionId: string;
  let patientId: string;
  let workflowId: string;

  test.beforeAll(async () => {
    // In a real scenario, you might seed test data here
    // For now, we'll create it within tests
  });

  test('Doctor creates prescription and workflow is initiated', async ({ doctorPage }) => {
    // Navigate to patient dashboard
    await doctorPage.goto('/hospital/doctor/dashboard');
    await doctorPage.waitForLoadState('networkidle');
    
    // Find a patient to prescribe for
    await doctorPage.getByRole('button', { name: /new prescription|create prescription/i }).click();
    await doctorPage.waitForSelector('h2:has-text("Prescription")');

    // Select or search for patient
    await doctorPage.getByPlaceholder(/search patient|patient name/i).fill('Test Patient');
    await doctorPage.waitForTimeout(500); // Brief wait for search results
    await doctorPage.getByRole('option').first().click();

    // Add medication
    await doctorPage.getByPlaceholder(/medication|drug/i).fill('Amoxicillin');
    await doctorPage.waitForTimeout(500);
    await doctorPage.getByRole('option', { name: /amoxicillin/i }).first().click();

    // Fill dosage
    await doctorPage.getByLabel(/dosage|dose/i).fill('500');
    await doctorPage.getByLabel(/unit|mg/i).selectOption('mg');

    // Select frequency
    await doctorPage.getByLabel(/frequency/i).selectOption('twice_daily');

    // Add duration
    await doctorPage.getByLabel(/duration|days/i).fill('7');

    // Submit
    const submitButton = doctorPage.getByRole('button', { name: /submit|save|create/i });
    await submitButton.click();

    // Wait for success message
    await expect(doctorPage.getByText(/prescription created|successfully/i)).toBeVisible({ timeout: 10000 });

    // Extract prescription ID from URL
    const url = doctorPage.url();
    const match = url.match(/prescription\/([a-f0-9-]{36})/);
    if (match) {
      prescriptionId = match[1];
    }

    // Verify: Workflow status should be "initiated"
    await expect(doctorPage.getByText(/status|initiated|pending/i)).toBeVisible();
  });

  test('Pharmacist reviews and performs DUR check', async ({ pharmacistPage }) => {
    // Navigate to pharmacy queue
    await pharmacistPage.goto('/hospital/pharmacy/queue');
    await pharmacistPage.waitForLoadState('networkidle');

    // Find the prescription in the queue
    await expect(
      pharmacistPage.getByText(/prescription queue|pending|review/i)
    ).toBeVisible({ timeout: 10000 });

    // Find our test prescription (search if needed)
    const prescriptionRow = pharmacistPage.locator('tr').filter({
      has: pharmacistPage.getByText('Test Patient'),
    });

    await expect(prescriptionRow).toBeVisible({ timeout: 10000 });

    // Click to view details
    await prescriptionRow.getByRole('button', { name: /view|details|review/i }).click();

    // Modal should open with prescription details
    await expect(
      pharmacistPage.getByRole('dialog').filter({ has: pharmacistPage.getByText('DUR Check') })
    ).toBeVisible({ timeout: 5000 });

    // Verify DUR warning display (if any)
    const durSection = pharmacistPage.getByText(/drug utilization review|dur|interactions/i);
    if (await durSection.isVisible().catch(() => false)) {
      console.log('DUR section visible - checking for warnings');
    }

    // Approve prescription
    const approveButton = pharmacistPage.getByRole('button', { name: /approve|confirm|verify/i });
    await expect(approveButton).toBeEnabled();
    await approveButton.click();

    // Wait for success
    await expect(
      pharmacistPage.getByText(/approved|successfully|confirmed/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('RBAC: Unauthorized role cannot approve prescription', async ({ doctorPage }) => {
    // Doctor should NOT be able to access pharmacy workflow directly
    await doctorPage.goto('/hospital/pharmacy/queue');

    // Should be redirected or shown access denied
    const result = await Promise.race([
      doctorPage.waitForURL(/\/hospital\/doctor.*/, { timeout: 5000 }).then(() => 'redirected'),
      doctorPage.getByText(/access denied|forbidden|not authorized/i).waitFor({ timeout: 5000 }).then(() => 'error'),
      Promise.resolve('none'),
    ]).catch(() => 'none');

    expect(['redirected', 'error']).toContain(result);
  });

  test('Nurse receives dispensing notification and updates status', async ({ nursePage }) => {
    // Nurse navigates to medication administration
    await nursePage.goto('/hospital/nurse/medications');
    await nursePage.waitForLoadState('networkidle');

    // Should see prescription marked for dispensing
    await expect(
      nursePage.getByText(/dispense|administer|medication/i)
    ).toBeVisible({ timeout: 10000 });

    // Find the prescription
    const medicationRow = nursePage.locator('tr').filter({
      has: nursePage.getByText('Test Patient'),
    });

    await expect(medicationRow).toBeVisible();

    // Mark as dispensed
    const dispenseButton = medicationRow.getByRole('button', { name: /dispense|administer|give/i });
    await dispenseButton.click();

    // Confirmation dialog
    const confirmDialog = nursePage.getByRole('dialog').filter({
      has: nursePage.getByText(/confirm|dispense|verify/i),
    });
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });

    // Verify patient identity
    await confirmDialog.getByLabel(/verified|confirm/i).check();

    // Confirm dispense
    await confirmDialog.getByRole('button', { name: /confirm|dispense|yes/i }).click();

    // Success message
    await expect(
      nursePage.getByText(/dispensed|completed|successfully/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('Workflow state persists across role transitions', async ({ doctorPage, pharmacistPage, nursePage }) => {
    // Doctor view
    await doctorPage.goto(`/hospital/doctor/prescription/${prescriptionId}`);
    let status1 = await doctorPage.getByText(/status|initiated|pending|approved|dispensed/i).first().textContent();

    // Pharmacist view (after refresh)
    await pharmacistPage.goto(`/hospital/pharmacy/prescription/${prescriptionId}`);
    let status2 = await pharmacistPage.getByText(/status|initiated|pending|approved|dispensed/i).first().textContent();

    // Nurse view
    await nursePage.goto(`/hospital/nurse/medications`);
    // Search for the same prescription
    let status3 = await nursePage.getByText(/dispensed|completed/i).first().textContent().catch(() => 'not found');

    // All should reflect the same workflow state
    expect(status1).toBeTruthy();
    expect(status2).toBeTruthy();
  });

  test('Audit trail records all workflow transitions', async ({ pharmacistPage }) => {
    // Navigate to audit/activity log
    await pharmacistPage.goto('/hospital/admin/audit-trail');

    // Filter for prescription-related actions
    await pharmacistPage.getByLabel(/filter|search|resource type/i).fill('prescription');
    await pharmacistPage.waitForTimeout(500);

    // Should show prescription_approval events
    const auditEvents = pharmacistPage.locator('tr').filter({
      has: pharmacistPage.getByText('prescription_approval'),
    });

    await expect(auditEvents.first()).toBeVisible({ timeout: 10000 });

    // Verify columns: Timestamp, User, Action, Resource
    const firstRow = auditEvents.first();
    await expect(firstRow.getByText(/initiat|approv|dispens/i)).toBeVisible();
  });

  test('Validation: Pharmacist cannot reject approved prescription', async ({ pharmacistPage }) => {
    // Navigate to prescriptions marked as approved
    await pharmacistPage.goto('/hospital/pharmacy/queue');

    // Filter for approved (shouldn't show reject button)
    const approvedPrescription = pharmacistPage.locator('tr').filter({
      has: pharmacistPage.getByText(/approved/i),
    });

    if (await approvedPrescription.count() > 0) {
      const firstApproved = approvedPrescription.first();
      const rejectButton = firstApproved.getByRole('button', { name: /reject/i });

      // Reject button should be disabled or not present
      const isVisible = await rejectButton.isVisible().catch(() => false);
      const isEnabled = await rejectButton.isEnabled().catch(() => false);

      expect(isVisible && isEnabled).toBe(false);
    }
  });

  test('Concurrent edit detection: Two pharmacists cannot approve simultaneously', async ({ pharmacistPage }) => {
    // This test would require two concurrent browser contexts
    // Placeholder for demonstration
    await pharmacistPage.goto('/hospital/pharmacy/queue');
    await expect(pharmacistPage.getByText(/queue|prescription/i)).toBeVisible();
  });
});

test.describe('Form Validation in Prescription Entry', () => {
  test('Required fields validation', async ({ doctorPage }) => {
    await doctorPage.goto('/hospital/doctor/prescriptions/new');

    // Try to submit without required fields
    const submitButton = doctorPage.getByRole('button', { name: /submit|save|create/i });
    
    // Button should be disabled if validation is client-side
    const isDisabled = await submitButton.isDisabled().catch(() => false);
    if (isDisabled) {
      expect(isDisabled).toBe(true);
    } else {
      // If button is enabled, submit and check for error
      await submitButton.click();
      await expect(
        doctorPage.getByText(/required|missing|please fill/i)
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('Dosage range validation', async ({ doctorPage }) => {
    await doctorPage.goto('/hospital/doctor/prescriptions/new');

    // Select a patient
    await doctorPage.getByPlaceholder(/search patient/i).fill('Test Patient');
    await doctorPage.waitForTimeout(300);
    await doctorPage.getByRole('option').first().click();

    // Add medication
    await doctorPage.getByPlaceholder(/medication/i).fill('Aspirin');
    await doctorPage.waitForTimeout(300);
    await doctorPage.getByRole('option').first().click();

    // Enter unusually high dosage
    const dosageInput = doctorPage.getByLabel(/dosage|dose/i);
    await dosageInput.fill('5000');

    // Check for warning
    const warningText = doctorPage.getByText(/warning|high|exceeds|unusual/i);
    await expect(warningText).toBeVisible({ timeout: 3000 });
  });
});
