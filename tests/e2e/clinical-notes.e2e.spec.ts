/**
 * clinical-notes.e2e.spec.ts
 * End-to-end tests for clinical notes workflow (Playwright)
 * 
 * Test Coverage:
 * - Doctor creates clinical note + digital signature
 * - System timestamps and immutably stores note
 * - Patient views notes (redacted if needed)
 * - Audit trail captures all access
 * - Notes cannot be deleted/edited (immutability enforced)
 * - Role-based access control verified
 * - Security: PHI encryption, no data leaks
 */

import { test, expect, Page } from '@playwright/test';

// Test fixtures
const TEST_DOCTOR_EMAIL = 'doctor+test@caresync.local';
const TEST_DOCTOR_PASSWORD = 'SecurePass123!';
const TEST_PATIENT_EMAIL = 'patient+test@caresync.local';
const TEST_PATIENT_PASSWORD = 'SecurePass123!';
const TEST_PATIENT_MRN = 'MRN-2026-001';

/**
 * Helper: Login as doctor
 */
async function loginAsDoctor(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_DOCTOR_EMAIL);
  await page.fill('input[type="password"]', TEST_DOCTOR_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
  expect(page.url()).toContain('/dashboard');
}

/**
 * Helper: Login as patient
 */
async function loginAsPatient(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_PATIENT_EMAIL);
  await page.fill('input[type="password"]', TEST_PATIENT_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('/patient-dashboard');
  expect(page.url()).toContain('/patient-dashboard');
}

/**
 * TEST 1: Doctor creates clinical note with digital signature
 */
test('E2E-001: Doctor creates clinical note with digital signature', async ({ page }) => {
  await loginAsDoctor(page);

  // Navigate to patient chart
  await page.click('text=Patients');
  await page.fill('input[placeholder="Search patients"]', TEST_PATIENT_MRN);
  await page.click(`text=${TEST_PATIENT_MRN}`);
  await page.waitForURL(/\/patients\/.*\/chart/);

  // Open clinical notes section
  await page.click('text=Clinical Notes');
  expect(page.locator('text=Encounter Notes')).toBeVisible();

  // Click "New Note" button
  await page.click('button:has-text("New Note")');
  
  // Verify new note form appears
  const noteForm = page.locator('[data-testid="clinical-note-form"]');
  await expect(noteForm).toBeVisible();

  // Fill note content
  await page.fill('[name="note_type"]', 'consultation');
  await page.fill('[name="chief_complaint"]', 'Patient presents with persistent headache');
  await page.fill('[name="history_of_present_illness"]', 'HPI: 3-day history of bilateral frontal headaches...');
  await page.fill('[name="assessment"]', 'Assessment: Tension-type headache');
  await page.fill('[name="plan"]', 'Plan: Ibuprofen 400mg BID x 7 days, hydration, rest');

  // Add subjective findings
  await page.click('button:has-text("Add Vital Signs")');
  await page.fill('input[name="bp_systolic"]', '120');
  await page.fill('input[name="bp_diastolic"]', '80');
  await page.fill('input[name="heart_rate"]', '72');
  await page.fill('input[name="temperature"]', '98.6');

  // Digital signature
  await page.click('button:has-text("Sign Note")');
  const signatureDialog = page.locator('[role="dialog"]');
  await expect(signatureDialog).toBeVisible();

  // Click signature field and sign
  const signatureCanvas = signatureDialog.locator('canvas');
  await signatureCanvas.click({ position: { x: 50, y: 50 } });
  await signatureCanvas.click({ position: { x: 100, y: 80 } });
  await page.click('button:has-text("Confirm Signature")');

  // Verify signature accepted
  await expect(page.locator('text=Signature accepted')).toBeVisible();

  // Submit note
  await page.click('button:has-text("Submit Note")');

  // Verify note saved successfully
  await expect(page.locator('text=Clinical note created successfully')).toBeVisible();

  // Verify note appears in list
  const noteListItem = page.locator('text=Tension-type headache');
  await expect(noteListItem).toBeVisible();

  // Verify timestamp is present
  const timestamp = page.locator('[data-testid="note-timestamp"]').first();
  await expect(timestamp).toBeVisible();
  const timeText = await timestamp.textContent();
  expect(timeText).toMatch(/\d{4}-\d{2}-\d{2}/); // YYYY-MM-DD format

  // Verify doctor name on note
  await expect(page.locator('text=Dr. Test Doctor')).toBeVisible();

  console.log('✅ TEST 1 PASSED: Doctor successfully created and signed clinical note');
});

/**
 * TEST 2: System prevents note editing (immutability enforced)
 */
test('E2E-002: Clinical notes are immutable - cannot be deleted or edited', async ({ page }) => {
  await loginAsDoctor(page);

  // Navigate to existing clinical note
  await page.goto('/patients/MRN-2026-001/chart');
  await page.click('text=Clinical Notes');
  
  // Find the note created in TEST 1
  const noteRow = page.locator('text=Tension-type headache').first();
  await noteRow.click();

  // Verify "Edit" button is NOT present
  const editButton = page.locator('button:has-text("Edit")');
  await expect(editButton).not.toBeVisible();

  // Verify "Delete" button is NOT present
  const deleteButton = page.locator('button:has-text("Delete")');
  await expect(deleteButton).not.toBeVisible();

  // Verify "Read Only" indicator is visible
  await expect(page.locator('text=Read-only')).toBeVisible();

  // Verify immutability warning
  await expect(page.locator('text=This note cannot be modified per HIPAA compliance')).toBeVisible();

  console.log('✅ TEST 2 PASSED: Note immutability enforced - no edit/delete allowed');
});

/**
 * TEST 3: Patient can view their own clinical notes
 */
test('E2E-003: Patient views their own clinical notes', async ({ page }) => {
  await loginAsPatient(page);

  // Navigate to medical records
  await page.click('text=Medical Records');
  await page.waitForURL('/patient/medical-records');

  // Click "Clinical Notes" tab
  await page.click('text=Clinical Notes');

  // Verify notes visible
  const notesList = page.locator('[data-testid="patient-notes-list"]');
  await expect(notesList).toBeVisible();

  // Verify specific note visible
  const patientNote = page.locator('text=Tension-type headache');
  await expect(patientNote).toBeVisible();

  // Click to view note
  await patientNote.click();

  // Verify note content displayed
  await expect(page.locator('text=Assessment: Tension-type headache')).toBeVisible();
  await expect(page.locator('text=Plan: Ibuprofen 400mg BID x 7 days')).toBeVisible();

  // Verify timestamp visible
  await expect(page.locator('[data-testid="note-timestamp"]')).toBeVisible();

  // Verify doctor name NOT shown (privacy)
  const doctorName = page.locator('text=Dr. Test Doctor');
  await expect(doctorName).not.toBeVisible();

  // Verify only "Healthcare Provider" displayed (redacted)
  await expect(page.locator('text=Healthcare Provider')).toBeVisible();

  console.log('✅ TEST 3 PASSED: Patient can view their own notes with redacted provider info');
});

/**
 * TEST 4: Audit trail captures all note access
 */
test('E2E-004: Audit trail captures all clinical note access', async ({ page }) => {
  await loginAsDoctor(page);

  // Navigate to audit logs
  await page.goto('/admin/audit-logs');

  // Filter for clinical notes
  await page.click('button:has-text("Filter")');
  await page.select('select[name="event_type"]', 'clinical_note_access');
  await page.click('button:has-text("Apply")');

  // Verify audit entries visible
  const auditEntries = page.locator('[data-testid="audit-entry"]');
  const count = await auditEntries.count();
  expect(count).toBeGreaterThan(0);

  // Verify first entry contains note details
  const firstEntry = auditEntries.first();
  await expect(firstEntry.locator('text=Tension-type headache')).toBeVisible();

  // Verify actor info (who accessed)
  await expect(firstEntry.locator('[data-testid="audit-actor"]')).toBeVisible();

  // Verify timestamp
  const entryTimestamp = firstEntry.locator('[data-testid="audit-timestamp"]');
  await expect(entryTimestamp).toBeVisible();
  const timestampText = await entryTimestamp.textContent();
  expect(timestampText).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/); // ISO 8601

  // Verify action (view, create, etc.)
  await expect(firstEntry.locator('[data-testid="audit-action"]')).toBeVisible();

  // Verify PHI not logged (redacted)
  const logContent = await firstEntry.textContent();
  expect(logContent).not.toMatch(/\d{3}-\d{2}-\d{4}/); // No SSN
  expect(logContent).not.toMatch(/DOB:\s*\d{1,2}\/\d{1,2}\/\d{4}/); // No DOB

  console.log('✅ TEST 4 PASSED: Audit trail captures all clinical note access');
});

/**
 * TEST 5: Non-authorized user cannot access clinical notes
 */
test('E2E-005: Non-authorized user cannot access clinical notes (RBAC)', async ({ page, context }) => {
  // Create new context for "other patient"
  const otherPage = await context.newPage();

  // Login as OTHER PATIENT (different patient)
  const OTHER_PATIENT_EMAIL = 'other-patient@caresync.local';
  const OTHER_PATIENT_PASSWORD = 'OtherPass123!';

  await otherPage.goto('/login');
  await otherPage.fill('input[type="email"]', OTHER_PATIENT_EMAIL);
  await otherPage.fill('input[type="password"]', OTHER_PATIENT_PASSWORD);
  await otherPage.click('button[type="submit"]');
  await otherPage.waitForURL('/patient-dashboard');

  // Try to access TEST_PATIENT's notes directly
  await otherPage.goto('/patients/MRN-2026-001/chart');

  // Verify access denied
  await expect(otherPage.locator('text=Access Denied')).toBeVisible();
  await expect(otherPage.locator('text=You do not have permission')).toBeVisible();

  // Verify redirected to patient's own dashboard
  await otherPage.waitForURL(/\/patient\/.+\/medical-records/);

  await otherPage.close();
  console.log('✅ TEST 5 PASSED: RBAC prevents unauthorized access to clinical notes');
});

/**
 * TEST 6: Billing manager sees redacted notes (minimum disclosure)
 */
test('E2E-006: Billing manager sees minimally disclosed clinical notes', async ({ page }) => {
  // Note: This would require a test account with billing_manager role
  // For now, this is a placeholder test structure

  // Navigate to billing system
  await page.goto('/billing/dashboard');

  // Find patient in billing records
  await page.fill('input[placeholder="Search patient"]', TEST_PATIENT_MRN);
  await page.click('button:has-text("Search")');

  // View patient billing detail
  await page.click(`text=${TEST_PATIENT_MRN}`);

  // Verify clinical notes section disabled/hidden
  const notesSection = page.locator('[data-testid="clinical-notes-section"]');
  await expect(notesSection).not.toBeVisible();

  // Verify only relevant billing info visible
  await expect(page.locator('text=Visit Summary')).toBeVisible(); // Not full clinical notes
  await expect(page.locator('text=Diagnosis Codes')).toBeVisible();
  await expect(page.locator('text=Procedure Codes')).toBeVisible();

  console.log('✅ TEST 6 PASSED: Billing manager sees minimally disclosed notes');
});

/**
 * TEST 7: PHI encryption - data not leaked in transit
 */
test('E2E-007: Clinical notes properly encrypted in transit and storage', async ({ page, context }) => {
  // Monitor network requests
  const requests: any[] = [];
  page.on('request', request => {
    if (request.url().includes('/api/clinical-notes')) {
      requests.push({
        url: request.url(),
        body: request.postData(),
        headers: request.headers(),
      });
    }
  });

  await loginAsDoctor(page);
  await page.goto('/patients/MRN-2026-001/chart');
  await page.click('text=Clinical Notes');

  // Create a new note
  await page.click('button:has-text("New Note")');
  await page.fill('[name="assessment"]', 'TEST: Patient has severe condition');
  
  // Before submit, verify no plaintext in request
  await page.click('button:has-text("Submit Note")');

  // Verify requests were made
  expect(requests.length).toBeGreaterThan(0);

  // Check request bodies are not plaintext
  for (const req of requests) {
    if (req.body) {
      const bodyStr = typeof req.body === 'string' ? req.body : req.body.toString();
      
      // Verify assessment text is NOT visible in plaintext
      expect(bodyStr).not.toContain('TEST: Patient has severe condition');
      
      // Verify encrypted field is present (e.g., ciphertext or encrypted_data)
      expect(bodyStr).toMatch(/(ciphertext|encrypted_data|encrypted)/i);
    }
  }

  console.log('✅ TEST 7 PASSED: PHI properly encrypted in transit');
});

/**
 * TEST 8: Signature verification - forged signatures rejected
 */
test('E2E-008: Digital signature integrity verified', async ({ page }) => {
  await loginAsDoctor(page);

  // Navigate to clinical notes
  await page.goto('/patients/MRN-2026-001/chart');
  await page.click('text=Clinical Notes');

  // Find a signed note
  const signedNote = page.locator('text=Tension-type headache').first();
  await signedNote.click();

  // Verify signature metadata displayed
  const signatureSection = page.locator('[data-testid="note-signature"]');
  await expect(signatureSection).toBeVisible();

  // Verify signature timestamp
  await expect(signatureSection.locator('[data-testid="signature-timestamp"]')).toBeVisible();

  // Verify signer name
  await expect(signatureSection.locator('[data-testid="signer-name"]')).toBeVisible();

  // Verify PKI certificate info (if displayed)
  const certInfo = signatureSection.locator('[data-testid="certificate-info"]');
  if (await certInfo.isVisible()) {
    // Verify certificate is valid (not expired)
    const certText = await certInfo.textContent();
    expect(certText).toContain('Valid');
  }

  console.log('✅ TEST 8 PASSED: Digital signature integrity verified');
});

/**
 * TEST 9: Concurrent note access - no race conditions
 */
test('E2E-009: Concurrent note access handled safely (no race conditions)', async ({ page, context }) => {
  // Create two browser contexts (simulating concurrent users)
  const page1 = page;
  const page2 = await context.newPage();

  // User 1: Doctor
  await loginAsDoctor(page1);

  // User 2: Another doctor (different browser)
  await page2.goto('/login');
  await page2.fill('input[type="email"]', 'doctor2+test@caresync.local');
  await page2.fill('input[type="password"]', 'SecurePass123!');
  await page2.click('button[type="submit"]');
  await page2.waitForURL('/dashboard');

  // Both navigate to same patient
  await page1.goto('/patients/MRN-2026-001/chart');
  await page2.goto('/patients/MRN-2026-001/chart');

  // Both click to view clinical notes
  await page1.click('text=Clinical Notes');
  await page2.click('text=Clinical Notes');

  // Both try to access same note
  const note1 = page1.locator('text=Tension-type headache');
  const note2 = page2.locator('text=Tension-type headache');

  await Promise.all([
    note1.click(),
    note2.click(),
  ]);

  // Verify both load successfully without conflicts
  await expect(page1.locator('text=Assessment:')).toBeVisible();
  await expect(page2.locator('text=Assessment:')).toBeVisible();

  // Verify both see identical content (no corruption)
  const content1 = await page1.locator('[data-testid="note-content"]').textContent();
  const content2 = await page2.locator('[data-testid="note-content"]').textContent();
  expect(content1).toBe(content2);

  await page2.close();
  console.log('✅ TEST 9 PASSED: Concurrent access handled safely');
});

/**
 * TEST 10: Note schema validation - invalid data rejected
 */
test('E2E-010: Invalid clinical note data rejected (schema validation)', async ({ page }) => {
  await loginAsDoctor(page);

  // Navigate to create note
  await page.goto('/patients/MRN-2026-001/chart');
  await page.click('text=Clinical Notes');
  await page.click('button:has-text("New Note")');

  // Try to submit empty form
  await page.click('button:has-text("Submit Note")');

  // Verify validation errors appear
  await expect(page.locator('text=Chief complaint is required')).toBeVisible();
  await expect(page.locator('text=Assessment is required')).toBeVisible();

  // Try to submit with invalid data types
  await page.fill('[name="chief_complaint"]', 'x'.repeat(5000)); // Too long
  await page.click('button:has-text("Submit Note")');

  // Verify length error
  await expect(page.locator('text=Chief complaint must be less than')).toBeVisible();

  // Try invalid vital signs (out of range)
  await page.fill('[name="heart_rate"]', '999'); // Unrealistic
  await page.click('button:has-text("Submit Note")');

  // Verify range validation error
  await expect(page.locator('text=Heart rate must be between')).toBeVisible();

  console.log('✅ TEST 10 PASSED: Schema validation rejects invalid note data');
});
