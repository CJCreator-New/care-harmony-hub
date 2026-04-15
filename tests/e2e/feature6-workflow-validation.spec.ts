import { test, expect } from "@playwright/test";

/**
 * Feature 6: Multi-Role Workflow Validation E2E Tests
 * Tests critical workflows across all user roles with authorization & audit validation
 */

// Test fixtures
const HOSPITAL_ID = "test-hospital-001";
const PATIENTS = {
  john: { id: "patient-001", name: "John Doe", dob: "1990-01-15" },
  jane: { id: "patient-002", name: "Jane Smith", dob: "1985-06-20" },
};

const USERS = {
  receptionist: { username: "receptionist@hims.local", role: "receptionist" },
  doctor: { username: "dr.smith@hims.local", role: "doctor" },
  nurse: { username: "nurse.jane@hims.local", role: "nurse" },
  pharmacy: { username: "pharmacy@hims.local", role: "pharmacy" },
  billing: { username: "billing@hims.local", role: "billing" },
};

test.describe("Feature 6: Multi-Role Workflow Validation", () => {
  // Shared state for workflows
  let appointmentId: string;
  let prescriptionId: string;
  let workflowId: string;

  test.describe("Workflow 1: Appointment Scheduling (Receptionist → Doctor → Nurse)", () => {
    test("1.1: Receptionist creates appointment", async ({ page, context }) => {
      // Login as receptionist
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.receptionist.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");
      await page.waitForURL("/dashboard");

      // Navigate to appointments
      await page.click("a:has-text('Appointments')");
      await page.click("button:has-text('New Appointment')");

      // Fill appointment form
      await page.fill("input[name=patient_name]", PATIENTS.john.name);
      await page.fill("input[name=appointment_date]", "2026-05-01");
      await page.fill("input[name=appointment_time]", "10:00");
      await page.fill("input[name=reason]", "Annual checkup");

      // Select doctor
      await page.click("select[name=doctor_id]");
      await page.click("option:has-text('Dr. Smith')");

      // Submit
      await page.click("button:has-text('Schedule Appointment')");

      // Verify success & capture appointment ID
      const successToast = page.locator("text=Appointment scheduled successfully");
      await expect(successToast).toBeVisible();

      // Extract appointment ID from URL or response
      appointmentId = "appt-" + Date.now().toString();

      // Verify audit log created
      const auditResponse = await context.request.get(
        `/api/audit-logs?record_id=${appointmentId}`
      );
      expect(auditResponse.ok()).toBeTruthy();
      const auditData = await auditResponse.json();
      expect(auditData[0].action).toBe("WORKFLOW_INITIATED");
      expect(auditData[0].description).toContain("appointment");
    });

    test("1.2: Doctor approves appointment", async ({ page }) => {
      // Login as doctor
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.doctor.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");
      await page.waitForURL("/dashboard");

      // Navigate to pending approvals
      await page.click("a:has-text('Approvals')");

      // Find & open appointment
      const appointmentRow = page.locator(`text=${PATIENTS.john.name}`).first();
      await expect(appointmentRow).toBeVisible();
      await appointmentRow.click();

      // Review and approve
      await page.click("button:has-text('Approve')");
      const confirmDialog = page.locator("text=Confirm appointment approval");
      await expect(confirmDialog).toBeVisible();
      await page.click("button:has-text('Yes, Approve')");

      // Verify approval success
      const successToast = page.locator("text=Appointment approved");
      await expect(successToast).toBeVisible();

      // Verify role-based visibility: Doctor sees confirmation, not billing details
      await expect(page.locator("text=Billing Information")).not.toBeVisible();
    });

    test("1.3: Nurse completes pre-appointment check", async ({ page }) => {
      // Login as nurse
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.nurse.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");
      await page.waitForURL("/dashboard");

      // Navigate to her appointments
      await page.click("a:has-text('Appointments')");

      // Find appointment
      const appointmentRow = page.locator(`text=${PATIENTS.john.name}`).first();
      await appointmentRow.click();

      // Complete vitals
      await page.fill("input[name=blood_pressure]", "120/80");
      await page.fill("input[name=heart_rate]", "72");
      await page.fill("input[name=temperature]", "37.0");

      // Allergy check
      await page.click('input[name="allergy_check"]');

      // Submit
      await page.click("button:has-text('Complete Pre-Check')");

      // Verify
      const confirmToast = page.locator("text=Pre-appointment check complete");
      await expect(confirmToast).toBeVisible();

      // Verify workflow progressed
      const workflowStatus = page.locator("text=Workflow Status: Ready for Visit");
      await expect(workflowStatus).toBeVisible();
    });

    test("1.4: Authorization violation - Nurse cannot approve appointments", async ({
      page,
    }) => {
      // Login as nurse
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.nurse.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");
      await page.waitForURL("/dashboard");

      // Try to access doctor's approvals section
      await page.goto("/approvals");

      // Should be forbidden
      const forbiddenMsg = page.locator("text=Access Denied");
      await expect(forbiddenMsg).toBeVisible();

      // Verify audit log for unauthorized attempt
      const auditNotification = page.locator(
        "text=Unauthorized access attempt logged"
      );
      await expect(auditNotification).toBeVisible();
    });
  });

  test.describe("Workflow 2: Prescription Issuance (Doctor → Pharmacy → Patient)", () => {
    test("2.1: Doctor issues prescription during telemedicine consultation", async ({
      page,
    }) => {
      // Login as doctor
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.doctor.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");

      // Navigate to patient
      await page.click("a:has-text('Patients')");
      const patientRow = page.locator(`text=${PATIENTS.john.name}`);
      await patientRow.click();

      // Open prescription form
      await page.click("button:has-text('Issue Prescription')");

      // Fill prescription
      await page.fill("input[name=medication]", "Amoxicillin");
      await page.fill("input[name=dosage]", "500mg");
      await page.fill("input[name=frequency]", "BID");
      await page.fill("input[name=duration_days]", "7");

      // Submit
      await page.click("button:has-text('Issue Prescription')");

      // Verify
      const successToast = page.locator("text=Prescription issued");
      await expect(successToast).toBeVisible();

      // Capture prescription ID from confirmation
      prescriptionId = await page
        .locator("text=Prescription ID:")
        .next()
        .textContent();
    });

    test("2.2: Pharmacy verifies prescription", async ({ page, context }) => {
      // Login as pharmacy
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.pharmacy.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");
      await page.waitForURL("/dashboard");

      // Navigate to pending prescriptions
      await page.click("a:has-text('Prescriptions')");
      const pendingTab = page.locator("button:has-text('Pending')");
      await pendingTab.click();

      // Find prescription
      const prescriptionRow = page.locator(`text=${PATIENTS.john.name}`).first();
      await prescriptionRow.click();

      // Review drug interactions
      const interactionWarning = page.locator(
        "text=No significant drug interactions detected"
      );
      await expect(interactionWarning).toBeVisible();

      // Verify stock available
      const stockStatus = page.locator("text=In Stock");
      await expect(stockStatus).toBeVisible();

      // Mark as verified
      await page.click("button:has-text('Verify & Dispense')");

      // Verify audit log for verification
      const { data: auditLogs } = await context.request.get(
        `/api/audit-logs?action=WORKFLOW_STEP_COMPLETED`
      );
      expect(auditLogs).toBeTruthy();
    });

    test("2.3: Patient receives notification", async ({ page }) => {
      // Simulate patient opening SMS/email notification
      // In real test: check SMS/email service mock

      // Patient navigates to portal
      await page.goto("/patient-portal/login");
      await page.fill("input[name=email]", "john@example.com");
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");

      // Check prescriptions
      await page.click("a:has-text('My Prescriptions')");

      // Verify prescription visible
      const prescriptionRow = page.locator("text=Amoxicillin");
      await expect(prescriptionRow).toBeVisible();

      const status = page.locator("text=Ready for Pickup").first();
      await expect(status).toBeVisible();
    });
  });

  test.describe("Workflow 3: Billing & Insurance Claims (Doctor → Billing → Insurance)", () => {
    test("3.1: Doctor completes clinical work, finalizes diagnosis codes", async ({
      page,
    }) => {
      // Login as doctor
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.doctor.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");

      // Navigate to completed appointment
      await page.click("a:has-text('Completed Appointments')");
      const appointmentRow = page.locator(`text=${PATIENTS.john.name}`).first();
      await appointmentRow.click();

      // Enter diagnoses
      await page.click("button:has-text('Add Diagnosis')");
      await page.fill("input[name=diagnosis_code]", "J06.9"); // ICD-10 for viral infection
      await page.fill("input[name=diagnosis_description]", "Acute upper respiratory infection");
      await page.click("button:has-text('Add')");

      // Add procedures
      await page.click("button:has-text('Add Procedure')");
      await page.fill("input[name=procedure_code]", "99213"); // CPT for office visit
      await page.fill("input[name=procedure_description]", "Office visit - established patient");
      await page.fill("input[name=procedure_charge]", "150.00");
      await page.click("button:has-text('Add')");

      // Mark as billable
      await page.click("button:has-text('Complete & Ready for Billing')");

      // Verify
      const confirmToast = page.locator("text=Appointment ready for billing processing");
      await expect(confirmToast).toBeVisible();
    });

    test("3.2: Billing department generates EDI 837 claim", async ({ page }) => {
      // Login as billing
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.billing.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");
      await page.waitForURL("/dashboard");

      // Navigate to billing queue
      await page.click("a:has-text('Billing Queue')");

      // Find appointment
      const appointmentRow = page.locator(`text=${PATIENTS.john.name}`).first();
      await appointmentRow.click();

      // Review charges
      const chargeAmount = page.locator("text=150.00");
      await expect(chargeAmount).toBeVisible();

      // Generate claim
      await page.click("button:has-text('Generate Claim')");

      // Verify EDI format available for review
      const ediPreview = page.locator("text=ISA*00");
      await expect(ediPreview).toBeVisible();

      // Submit to insurance
      await page.click("button:has-text('Submit Claim')");

      // Verify
      const submittedToast = page.locator("text=Claim submitted to insurance");
      await expect(submittedToast).toBeVisible();
    });

    test("3.3: Billing calculates patient copay correctly", async ({ page }) => {
      // Same setup as 3.2
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.billing.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");

      // Navigate to claims processing
      await page.click("a:has-text('Claims')");

      // Find recent claim
      const claimRow = page.locator(`text=${PATIENTS.john.name}`).first();
      await claimRow.click();

      // Review copay calculation
      const copayAmount = page.locator("text=Copay: $35.00");
      await expect(copayAmount).toBeVisible();

      // Verify deductible handling
      const deductibleMsg = page.locator(
        "text=Deductible: $500.00 (Patient has $450 remaining)"
      );
      await expect(deductibleMsg).toBeVisible();

      // Verify calculation breakdown
      const breakdownBtn = page.locator("button:has-text('Show Calculation')");
      await breakdownBtn.click();

      const breakdown = page.locator("text=Insurance pays");
      await expect(breakdown).toBeVisible();
    });

    test("3.4: Authorization violation - Nurse cannot submit insurance claims", async ({
      page,
    }) => {
      // Login as nurse
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.nurse.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");

      // Try to access billing section
      await page.goto("/billing");

      // Should be forbidden
      const forbiddenMsg = page.locator("text=Access Denied");
      await expect(forbiddenMsg).toBeVisible();

      // Verify audit logged
      const auditLogBtn = page.locator("button:has-text('View Security Log')");
      if (await auditLogBtn.isVisible()) {
        await auditLogBtn.click();
        const unauthorizedEntry = page.locator(
          "text=Unauthorized access attempt: /billing"
        );
        await expect(unauthorizedEntry).toBeVisible();
      }
    });
  });

  test.describe("Workflow 4: Clinical Notes (Doctor → Sign → Nurse Observations)", () => {
    test("4.1: Doctor writes and signs clinical notes", async ({ page }) => {
      // Login as doctor
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.doctor.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");

      // Navigate to appointment
      await page.click("a:has-text('Appointments')");
      const appointmentRow = page.locator(`text=${PATIENTS.john.name}`).first();
      await appointmentRow.click();

      // Open clinical notes
      await page.click("button:has-text('Clinical Notes')");

      // Fill note content
      await page.fill(
        "textarea[name=chief_complaint]",
        "Regular checkup, feeling well"
      );
      await page.fill(
        "textarea[name=findings]",
        "Blood pressure normal, heart rate regular, lungs clear"
      );
      await page.fill(
        "textarea[name=assessment]",
        "Patient in good overall health. No acute conditions noted."
      );
      await page.fill(
        "textarea[name=plan]",
        "Continue current medications. Return in 6 months. No restrictions."
      );

      // Save as draft
      await page.click("button:has-text('Save as Draft')");

      // Verify
      const draftToast = page.locator("text=Clinical note saved as draft");
      await expect(draftToast).toBeVisible();

      // Now sign the note
      await page.click("button:has-text('Sign & Lock')");

      // Enter signature private key
      const keyInput = page.locator("textarea[name=private-key]");
      await keyInput.fill("-----BEGIN PRIVATE KEY-----\nMIIBVAIBADANBg...");

      // Sign
      await page.click("button:has-text('Sign & Lock Note')");

      // Verify signed status
      const signedBadge = page.locator("text=✓ Signed");
      await expect(signedBadge).toBeVisible();

      // Verify note is now immutable, edit button disabled
      const editBtn = page.locator("button:has-text('Edit')");
      await expect(editBtn).toBeDisabled();
    });

    test("4.2: Nurse adds append-only observations to locked note", async ({
      page,
    }) => {
      // Login as nurse
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.nurse.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");

      // Navigate to patient's notes
      await page.click("a:has-text('Patients')");
      const patientRow = page.locator(`text=${PATIENTS.john.name}`);
      await patientRow.click();

      // View clinical notes
      await page.click("a:has-text('Clinical Notes')");

      // Note is locked, cannot edit
      const editButtons = page.locator("button:has-text('Edit')");
      await expect(editButtons).toHaveCount(0);

      // But can add observations
      const observationSection = page.locator("text=Nurse Observations");
      await expect(observationSection).toBeVisible();

      // Add observation
      await page.select("select[name=category]", "vital_sign");
      await page.fill(
        "textarea[name=observation]",
        "Patient reports feeling well at discharge. Vitals stable."
      );

      // Submit
      await page.click("button:has-text('Record Observation')");

      // Verify
      const successToast = page.locator("text=Observation recorded");
      await expect(successToast).toBeVisible();

      // Verify observation visible and locked
      const observationEntry = page.locator(
        "text=Patient reports feeling well at discharge"
      );
      await expect(observationEntry).toBeVisible();
    });

    test("4.3: Doctor cannot modify notes after signing", async ({ page }) => {
      // Login as doctor
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.doctor.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");

      // Navigate to signed note
      await page.click("a:has-text('Appointments')");
      const appointmentRow = page.locator(`text=${PATIENTS.john.name}`).first();
      await appointmentRow.click();
      await page.click("button:has-text('Clinical Notes')");

      // Try to edit findings
      const findingsField = page.locator("textarea[name=findings]");
      const isDisabled = await findingsField.isDisabled();
      expect(isDisabled).toBe(true);

      // Verify immutable badge
      const immutableBadge = page.locator("text=Immutable - Locked");
      await expect(immutableBadge).toBeVisible();

      // Verify audit trail visible
      const auditTrailBtn = page.locator("button:has-text('View Audit')");
      await auditTrailBtn.click();

      const auditEntries = page.locator("text=Digital signature applied");
      await expect(auditEntries).toBeVisible();
    });
  });

  test.describe("Workflow Audit & Compliance", () => {
    test("5.1: Full audit trail captured for all workflow steps", async ({
      page,
      context,
    }) => {
      // Login as admin to view audit logs
      await page.goto("/login");
      await page.fill("input[name=username]", "admin@hims.local");
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");

      // Navigate to audit logs
      await page.click("a:has-text('Security')");
      await page.click("a:has-text('Audit Logs')");

      // Filter by workflow
      await page.fill("input[name=workflow_id]", appointmentId);
      await page.click("button:has-text('Filter')");

      // Verify all steps logged
      const stepLogs = page.locator("text=WORKFLOW_STEP_COMPLETED");
      const count = await stepLogs.count();
      expect(count).toBeGreaterThan(0);

      // Verify each log has required fields
      const firstLog = stepLogs.first();
      const timestamp = firstLog.locator("text=202");
      await expect(timestamp).toBeVisible(); // YYYY-MM-DD format

      const userId = firstLog.locator("text=@hims.local");
      await expect(userId).toBeVisible();
    });

    test("5.2: Workflow compliance validation passes", async ({
      page,
      context,
    }) => {
      // Login as admin
      await page.goto("/login");
      await page.fill("input[name=username]", "admin@hims.local");
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");

      // Navigate to compliance checker
      await page.click("a:has-text('Compliance')");
      await page.click("a:has-text('Workflow Validation')");

      // Check specific workflow
      await page.fill("input[name=workflow_id]", appointmentId);
      await page.click("button:has-text('Validate')");

      // Verify compliance passed
      const complianceStatus = page.locator("text=✓ Compliant");
      await expect(complianceStatus).toBeVisible();

      // Verify all validation checks passed
      const authCheck = page.locator("text=✓ Role Authorization Verified");
      await expect(authCheck).toBeVisible();

      const auditCheck = page.locator("text=✓ Audit Trail Complete");
      await expect(auditCheck).toBeVisible();

      const dataIntegrityCheck = page.locator("text=✓ Data Integrity Verified");
      await expect(dataIntegrityCheck).toBeVisible();
    });

    test("5.3: Non-compliant workflows flagged", async ({ page }) => {
      // Simulate a workflow with skipped steps (manually bypass authorization)
      // This would be a security test - creating an invalid workflow state

      // Login as admin
      await page.goto("/login");
      await page.fill("input[name=username]", "admin@hims.local");
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");

      // Navigate to compliance checker
      await page.click("a:has-text('Compliance')");
      await page.click("a:has-text('Workflow Validation')");

      // Check for violations
      await page.fill("input[name=status_filter]", "violated");
      await page.click("button:has-text('Filter')");

      // Verify violations shown
      const violationBadge = page.locator("text=⚠ Non-Compliant");
      const violationCount = await violationBadge.count();

      if (violationCount > 0) {
        // Click first violation
        await violationBadge.first().click();

        // Verify violation details
        const violationDetail = page.locator(
          "text=Unauthorized step execution detected"
        );
        await expect(violationDetail).toBeVisible();
      }
    });
  });

  test.describe("Performance & Load Testing", () => {
    test("6.1: Workflow transitions complete within SLA", async ({
      page,
      context,
    }) => {
      // Measure time for complete workflow
      const startTime = Date.now();

      // Login as receptionist
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.receptionist.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");

      // Create appointment (first step)
      await page.click("a:has-text('Appointments')");
      await page.click("button:has-text('New Appointment')");
      await page.fill("input[name=patient_name]", PATIENTS.john.name);
      await page.click("button:has-text('Schedule')");

      // Measure doctor approval time
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.doctor.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");

      const doctorStartTime = Date.now();

      await page.click("a:has-text('Approvals')");
      const appointmentRow = page.locator(`text=${PATIENTS.john.name}`).first();
      await appointmentRow.click();
      await page.click("button:has-text('Approve')");
      await page.click("button:has-text('Yes, Approve')");

      const doctorTime = Date.now() - doctorStartTime;

      // Doctor approval should be < 2 seconds
      expect(doctorTime).toBeLessThan(2000);

      const totalTime = Date.now() - startTime;

      // Full workflow < 15 seconds
      expect(totalTime).toBeLessThan(15000);

      console.log(`Workflow completed in ${totalTime}ms`);
    });

    test("6.2: Audit logging doesn't block workflow transitions", async ({
      page,
    }) => {
      const transitionStartTime = Date.now();

      // Login and complete workflow step
      await page.goto("/login");
      await page.fill("input[name=username]", USERS.doctor.username);
      await page.fill("input[name=password]", "testpass123");
      await page.click("button:has-text('Login')");

      await page.click("a:has-text('Approvals')");
      const appointmentRow = page.locator(`text=${PATIENTS.john.name}`).first();
      await appointmentRow.click();
      await page.click("button:has-text('Approve')");
      await page.click("button:has-text('Yes, Approve')");

      // Wait for success
      await page.locator("text=Appointment approved").waitFor();

      const transitionTime = Date.now() - transitionStartTime;

      // Should be fast even with audit logging
      expect(transitionTime).toBeLessThan(3000);
    });
  });
});
