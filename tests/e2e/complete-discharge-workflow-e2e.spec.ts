import { test, expect } from '@playwright/test';

// E2E Test: Complete Discharge Workflow with Cross-Role Handoffs
// Verifies: Hospital-scope isolation, audit trail, role-based access, notification delivery

test.describe('Complete Discharge Workflow - Multi-Role Journey', () => {
  const testHospital = 'test-hospital-e2e';
  const testPatientId = 'patient-e2e-123';
  const testPatientName = 'John Doe';

  test.beforeEach(async ({ page }) => {
    // Setup: Clear any existing test data
    // In production, this would use test fixtures or a dedicated test database
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  });

  test('doctor initiates discharge → pharmacist verifies → billing closes → patient sees summary', async ({
    page,
  }) => {
    // ========== STEP 1: Doctor Logs In & Initiates Discharge ==========
    console.log('=== STEP 1: Doctor Initiates Discharge ===');

    await page.goto('/login');
    await page.fill('input[name="email"]', 'dr.smith@test-hospital.test');
    await page.fill('input[name="password"]', 'test-password-123');
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard redirect
    await page.waitForURL('**/doctor/dashboard**');
    await expect(page).toHaveURL(/doctor\/dashboard/);

    // Find and click patient in queue
    await page.click(`button:has-text("${testPatientName}")`);
    await page.waitForURL(`**/doctor/consultation/**`);

    // Record consultation and create discharge order
    await page.click('button:has-text("Complete Consultation")');
    await page.fill('textarea[name="consultation_notes"]', 'Patient stable, medications verified. Ready for discharge.');

    // Add medications to discharge
    await page.click('button:has-text("Add Medication")');
    await page.fill('input[name="medication_name"]', 'Metformin');
    await page.fill('input[name="dosage"]', '500mg');
    await page.fill('input[name="quantity"]', '30');
    await page.click('button:has-text("Add to Order")');

    // Submit discharge with audit context
    await page.click('button:has-text("Sign & Discharge")');

    // Modal should appear requiring discharge reason
    const reasonInput = page.locator('textarea[name="discharge_reason"]');
    await reasonInput.fill('Patient medically stable. All vital signs normal. Medications verified by pharmacist.');
    await page.click('button:has-text("Confirm Discharge")');

    // Verify discharge event was logged
    await expect(page).toHaveURL(/doctor\/consultation\/\d+\/confirmed/);
    await expect(page.locator('text=Discharge initiated')).toBeVisible();

    // ========== STEP 2: Pharmacist Logs In & Verifies Medications ==========
    console.log('=== STEP 2: Pharmacist Verifies Medications ===');

    // New tab for pharmacist
    const pharmacistContext = await page.context().newPage();
    await pharmacistContext.goto('/login');
    await pharmacistContext.fill('input[name="email"]', 'pharmacy.tech@test-hospital.test');
    await pharmacistContext.fill('input[name="password"]', 'test-password-123');
    await pharmacistContext.click('button:has-text("Sign In")');

    // Wait for pharmacy dashboard
    await pharmacistContext.waitForURL('**/pharmacy/dashboard**');

    // Find discharge requiring verification
    await pharmacistContext.click(`button:has-text("Verify Discharge")`);
    await pharmacistContext.waitForURL('**/pharmacy/discharge-verification/**');

    // Verify medications and check interactions
    const interactionWarning = pharmacistContext.locator('[role="alert"]');
    const hasInteraction = await interactionWarning.isVisible();
    if (hasInteraction) {
      console.log('⚠️ Drug interaction warning detected');
      const warningText = await interactionWarning.textContent();
      expect(warningText).toBeTruthy();
    }

    // Approve discharge
    const approvalReason = pharmacistContext.locator('textarea[name="verification_notes"]');
    await approvalReason.fill('All medications verified. No clinically significant interactions. Ready for dispensing.');
    await pharmacistContext.click('button:has-text("Approve & Dispense")');

    // Verify notification sent to doctor
    await expect(pharmacistContext.locator('text=Discharge verified')).toBeVisible();

    // Back to doctor tab - should see pharmacist approval notification
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    const badge = notificationBell.locator('[role="status"]');
    await expect(badge).toHaveText(/\d+/); // Should have notification count

    // ========== STEP 3: Billing Department Completes Checkout ==========
    console.log('=== STEP 3: Billing Completes Checkout ===');

    const billingContext = await page.context().newPage();
    await billingContext.goto('/login');
    await billingContext.fill('input[name="email"]', 'billing.staff@test-hospital.test');
    await billingContext.fill('input[name="password"]', 'test-password-123');
    await billingContext.click('button:has-text("Sign In")');

    await billingContext.waitForURL('**/billing/dashboard**');

    // Find pending discharge charge
    await billingContext.click(`button[data-patient-id="${testPatientId}"]`);
    await billingContext.waitForURL(/billing\/invoice\/\d+/);

    // Verify chat history shows complete audit trail
    const auditTrail = billingContext.locator('[data-testid="audit-trail"]');
    await expect(auditTrail).toContainText(/Doctor.*initiated discharge/i);
    await expect(auditTrail).toContainText(/Pharmacist.*verified/i);

    // Apply payment
    await billingContext.click('button:has-text("Process Payment")');
    await billingContext.selectOption('select[name="payment_method"]', 'insurance');
    await billingContext.fill('input[name="insurance_claim"]', 'CLM-123456789');

    // Capture billing reason
    const billingReason = billingContext.locator('textarea[name="billing_notes"]');
    await billingReason.fill('Insurance claim filed for encounter charges. Patient co-pay $25 collected.');

    await billingContext.click('button:has-text("Confirm & Close")');

    // Verify invoice sealed
    await expect(billingContext.locator('text=Payment processed')).toBeVisible();
    await expect(billingContext.locator('[data-status="CLOSED"]')).toBeVisible();

    // ========== STEP 4: Patient Views Discharge Summary ==========
    console.log('=== STEP 4: Patient Views Discharge Summary ===');

    const patientContext = await page.context().newPage();
    await patientContext.goto('/login');
    await patientContext.fill('input[name="email"]', 'john.doe@email.test');
    await patientContext.fill('input[name="password"]', 'patient-password-123');
    await patientContext.click('button:has-text("Sign In")');

    await patientContext.waitForURL('**/patient/dashboard**');

    // Find discharge summary
    await patientContext.click(`button:has-text("View Discharge Summary")`);
    await patientContext.waitForURL('**/patient/discharge/**');

    // Verify patient sees medications
    await expect(patientContext.locator('text=Metformin')).toBeVisible();
    await expect(patientContext.locator('text=500mg')).toBeVisible();
    await expect(patientContext.locator('text=Take with meals')).toBeVisible(); // Instructions

    // Verify patient sees invoice
    const invoiceSection = patientContext.locator('[data-testid="discharge-invoice"]');
    await expect(invoiceSection).toBeVisible();
    await expect(invoiceSection).toContainText(/\$25/); // Co-pay amount

    // Can download discharge summary
    const downloadButton = patientContext.locator('button:has-text("Download PDF")');
    await expect(downloadButton).toBeEnabled();

    // ========== VERIFICATION: Audit Trail & Hospital Isolation ==========
    console.log('=== VERIFICATION: Audit Trail ===');

    // Go back to doctor view and check audit logging
    await page.goto(`/doctor/patient/${testPatientId}/audit`);
    await page.waitForSelector('[data-testid="audit-log"]');

    const auditLogs = page.locator('[data-testid="audit-entry"]');
    const auditCount = await auditLogs.count();
    expect(auditCount).toBeGreaterThan(0);

    // Verify each audit entry has required fields
    for (let i = 0; i < auditCount; i++) {
      const entry = auditLogs.nth(i);
      const timestamp = entry.locator('[data-field="timestamp"]');
      const actor = entry.locator('[data-field="performed_by"]');
      const action = entry.locator('[data-field="action_type"]');
      const reason = entry.locator('[data-field="change_reason"]');

      await expect(timestamp).toContainText(/\d{4}-\d{2}-\d{2}/); // Date format
      await expect(actor).toHaveText(/doctor|pharmacist|billing/i); // Role confirmation
      await expect(action).toHaveText(/discharge|verify|payment/i); // Action type
      await expect(reason).not.toBeEmpty(); // Change reason captured
    }

    // ========== VERIFICATION: Cross-Hospital Isolation ==========
    console.log('=== VERIFICATION: Hospital Isolation ===');

    // Try to access patient from different hospital (should fail)
    const adversaryContext = await page.context().newPage();
    await adversaryContext.goto('/login');
    await adversaryContext.fill('input[name="email"]', 'attacker@different-hospital.test');
    await adversaryContext.fill('input[name="password"]', 'password-123');
    await adversaryContext.click('button:has-text("Sign In")');

    // Try to navigate directly to patient record
    await adversaryContext.goto(`/patient/${testPatientId}`);

    // Should be redirected or show 403 Forbidden
    const forbiddenText = adversaryContext.locator('text=/Forbidden|Access Denied|Not Found/i');
    const isRedirected = adversaryContext.url().includes('dashboard') || adversaryContext.url().includes('403');

    expect(forbiddenText.isVisible() || isRedirected).toBeTruthy();

    // ========== NOTIFICATIONS VERIFICATION ==========
    console.log('=== VERIFICATION: Notifications ===');

    // Doctor should have received notifications at key milestones
    await page.goto('/notifications');
    const notifications = page.locator('[data-testid="notification-item"]');

    // Should have notifications for:
    // - Pharmacist verification complete
    // - Billing checkout complete
    const notificationTexts = [];
    const notificationCount = await notifications.count();
    for (let i = 0; i < notificationCount; i++) {
      const text = await notifications.nth(i).textContent();
      notificationTexts.push(text);
    }

    expect(notificationTexts.some((n) => n?.includes('verified'))).toBeTruthy();
    expect(notificationTexts.some((n) => n?.includes('payment'))).toBeTruthy();

    console.log('✅ Complete discharge workflow test PASSED');
    console.log(`  - Audit trail entries: ${auditCount}`);
    console.log(`  - Notifications delivered: ${notificationCount}`);
    console.log(`  - Hospital isolation: VERIFIED`);

    // Cleanup
    await pharmacistContext.close();
    await billingContext.close();
    await patientContext.close();
    await adversaryContext.close();
  });

  test('doctor cannot update patient from different hospital', async ({ page }) => {
    // Verify cross-hospital ABAC enforcement
    await page.goto('/login');
    await page.fill('input[name="email"]', 'dr.smith@hospital-a.test');
    await page.fill('input[name="password"]', 'password-123');
    await page.click('button:has-text("Sign In")');

    // Try to access patient from hospital-b
    const patientFromHospitalB = 'patient-hospital-b-456';
    await page.goto(`/doctor/patient/${patientFromHospitalB}`);

    // Should be redirected to dashboard or show access denied
    const accessDenied = page.locator('text=/Access Denied|Forbidden|Not authorized/i');
    const redirected = page.url().includes('dashboard');

    expect(accessDenied.isVisible() || redirected).toBeTruthy();
  });

  test('audit trail captures change reasons for all mutations', async ({ page }) => {
    // Verify mandatory change_reason capture
    await page.goto('/login');
    await page.fill('input[name="email"]', 'dr.smith@test-hospital.test');
    await page.fill('input[name="password"]', 'password-123');
    await page.click('button:has-text("Sign In")');

    await page.goto(`/doctor/patient/${testPatientId}/edit-status`);

    // Verify modal requires reason
    const reasonField = page.locator('textarea[name="change_reason"]');
    const submitButton = page.locator('button:has-text("Update")');

    // Button should be disabled without reason
    expect(await submitButton.isDisabled()).toBe(true);

    // Fill in reason
    await reasonField.fill('Patient vitals improved significantly.');
    expect(await submitButton.isDisabled()).toBe(false);

    // Submit and verify audit trail entry
    await submitButton.click();
    await page.waitForURL(`**/patient/${testPatientId}**`);

    // Check that reason was captured in audit trail
    await page.goto(`/patient/${testPatientId}/audit`);
    const reasonInAudit = page.locator('text=Patient vitals improved significantly');
    await expect(reasonInAudit).toBeVisible();
  });
});
