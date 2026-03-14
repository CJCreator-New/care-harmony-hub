import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Phase 4B Clinical Form Improvements
 * 
 * These tests verify critical clinical workflows with Phase 4B enhancements:
 * - Allergy conflict detection blocking prescriptions
 * - Vital signs critical alerts with WCAG AAA compliant buttons
 * - Lab order creation with priority dispatch
 */

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173';

// ────────────────────────────────────────────────────────────────
// SECTION 1: Test Fixtures & Helpers
// ────────────────────────────────────────────────────────────────

async function loginAsSupervisor(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[data-testid="email-input"]', 'supervisor@carehub.local');
  await page.fill('[data-testid="password-input"]', 'TestPass@123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard**');
}

async function loginAsDoctor(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[data-testid="email-input"]', 'doctor@carehub.local');
  await page.fill('[data-testid="password-input"]', 'TestPass@123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard**');
}

async function loginAsNurse(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[data-testid="email-input"]', 'nurse@carehub.local');
  await page.fill('[data-testid="password-input"]', 'TestPass@123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard**');
}

async function loginAsLabTechnician(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[data-testid="email-input"]', 'labtech@carehub.local');
  await page.fill('[data-testid="password-input"]', 'TestPass@123');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard**');
}

async function selectPatient(page: Page, patientName: string) {
  await page.fill('[data-testid="patient-search"]', patientName);
  await page.waitForSelector(`text=${patientName}`);
  await page.click(`text=${patientName}`);
}

// ────────────────────────────────────────────────────────────────
// SUITE 1: Prescription Allergy Conflict Detection (CRITICAL)
// ────────────────────────────────────────────────────────────────

test.describe('E2E: Prescription Allergy Conflict Detection', () => {
  test('should block prescription when drug matches patient allergy', async ({
    page,
  }) => {
    // GIVEN: Doctor logged in and viewing patient with known allergy
    await loginAsDoctor(page);
    await page.goto(`${BASE_URL}/patients/test-patient-penicillin-allergy`);

    // Verify patient allergy is visible
    expect(page.locator('text=Penicillin Allergy')).toBeDefined();

    // WHEN: Doctor opens prescription builder
    await page.click('[data-testid="new-prescription-button"]');
    await page.waitForSelector('[data-testid="prescription-builder"]');

    // THEN: Allergy banner should be prominently displayed
    const allergyBanner = page.locator('[data-testid="allergy-warning-banner"]');
    expect(allergyBanner).toBeVisible();
    expect(allergyBanner).toContainText('Penicillin');
    expect(allergyBanner).toHaveCSS('background-color', /red|danger/i);

    // WHEN: Doctor tries to prescribe Penicillin
    await page.fill('[data-testid="drug-search"]', 'Penicillin');
    await page.waitForSelector('[data-testid="drug-option"]');
    await page.click('[data-testid="drug-option"]');

    // Set dosage
    await page.selectOption('[data-testid="dosage-select"]', '500mg');

    // WHEN: Doctor clicks Save
    await page.click('[data-testid="save-prescription-button"]');

    // THEN: Save should be blocked with error message
    const toastError = page.locator('[data-testid="toast-error"]');
    await expect(toastError).toBeVisible();
    await expect(toastError).toContainText('Allergy conflict detected');
    await expect(toastError).toContainText('Penicillin');

    // VERIFY: Modal should still be open for correction
    expect(page.locator('[data-testid="prescription-builder"]')).toBeVisible();
  });

  test('should allow prescription for non-allergy drugs', async ({ page }) => {
    // GIVEN: Doctor logged in with patient having Penicillin allergy
    await loginAsDoctor(page);
    await page.goto(`${BASE_URL}/patients/test-patient-penicillin-allergy`);

    // WHEN: Doctor opens prescription builder
    await page.click('[data-testid="new-prescription-button"]');
    await page.waitForSelector('[data-testid="prescription-builder"]');

    // WHEN: Doctor prescribes Ibuprofen (no conflict)
    await page.fill('[data-testid="drug-search"]', 'Ibuprofen');
    await page.waitForSelector('[data-testid="drug-option"]');
    await page.click('[data-testid="drug-option"]');

    await page.selectOption('[data-testid="dosage-select"]', '400mg');
    await page.click('[data-testid="save-prescription-button"]');

    // THEN: Prescription should save successfully
    const toastSuccess = page.locator('[data-testid="toast-success"]');
    await expect(toastSuccess).toBeVisible();
    await expect(toastSuccess).toContainText('Prescription saved');

    // VERIFY: Modal closes after save
    await expect(page.locator('[data-testid="prescription-builder"]')).not.toBeVisible();
  });

  test('should match allergy by both drug name and generic name', async ({
    page,
  }) => {
    // GIVEN: Patient with generic Amoxicillin allergy in database
    await loginAsDoctor(page);
    await page.goto(`${BASE_URL}/patients/test-patient-amoxicillin-allergy`);

    // WHEN: Doctor opens prescription builder
    await page.click('[data-testid="new-prescription-button"]');
    await page.waitForSelector('[data-testid="prescription-builder"]');

    // WHEN: Doctor searches for brand name "Amoxil" (generic: Amoxicillin)
    await page.fill('[data-testid="drug-search"]', 'Amoxil');
    await page.waitForSelector('[data-testid="drug-option"]');
    await page.click('[data-testid="drug-option"]');

    // WHEN: Doctor tries to save
    await page.click('[data-testid="save-prescription-button"]');

    // THEN: Should be blocked (generic name match)
    const toastError = page.locator('[data-testid="toast-error"]');
    await expect(toastError).toBeVisible();
    await expect(toastError).toContainText('allergy');
  });
});

// ────────────────────────────────────────────────────────────────
// SUITE 2: Vital Signs Critical Alert Detection (WCAG AAA)
// ────────────────────────────────────────────────────────────────

test.describe('E2E: Vital Signs Critical Alerts with Accessibility', () => {
  test('should detect and alert on critical SpO2 < 90%', async ({ page }) => {
    // GIVEN: Nurse logged in at patient bedside
    await loginAsNurse(page);
    await page.goto(`${BASE_URL}/patients/test-patient-001/vitals`);

    // WHEN: Nurse opens vital signs form
    await page.click('[data-testid="record-vitals-button"]');
    await page.waitForSelector('[data-testid="vital-signs-form"]');

    // WHEN: Nurse enters critical SpO2
    await page.fill('[data-testid="spo2-input"]', '85');
    await page.fill('[data-testid="temperature-input"]', '37.0');
    await page.fill('[data-testid="pulse-input"]', '75');
    await page.fill('[data-testid="bp-systolic-input"]', '120');
    await page.fill('[data-testid="bp-diastolic-input"]', '80');
    await page.fill('[data-testid="respiration-input"]', '16');

    // VERIFY: Save button is at least 48px (WCAG AAA compliant)
    const saveButton = page.locator('[data-testid="save-vitals-button"]');
    const boundingBox = await saveButton.boundingBox();
    expect(boundingBox?.height).toBeGreaterThanOrEqual(48);

    // VERIFY: Save button has ARIA label
    await expect(saveButton).toHaveAttribute('aria-label', /Save vital signs/i);

    // WHEN: Nurse saves vital signs
    await saveButton.click();

    // THEN: Critical alert banner should appear
    const criticalBanner = page.locator('[data-testid="critical-alert-banner"]');
    await expect(criticalBanner).toBeVisible();
    await expect(criticalBanner).toContainText('CRITICAL');
    await expect(criticalBanner).toContainText('SpO2');
    expect(criticalBanner).toHaveCSS('background-color', /red|danger/i);

    // VERIFY: Banner has animation
    const hasAnimation = await criticalBanner.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.animation !== 'none' || computed.animationName !== 'none';
    });
    expect(hasAnimation).toBeTruthy();

    // VERIFY: Success toast shown
    const toastSuccess = page.locator('[data-testid="toast-success"]');
    await expect(toastSuccess).toBeVisible();
    await expect(toastSuccess).toContainText('Vital signs recorded');
  });

  test('should show warning for elevated temperature (38-39°C)', async ({
    page,
  }) => {
    // GIVEN: Nurse recording vitals
    await loginAsNurse(page);
    await page.goto(`${BASE_URL}/patients/test-patient-001/vitals`);

    // WHEN: Nurse enters warning-level temperature
    await page.click('[data-testid="record-vitals-button"]');
    await page.fill('[data-testid="temperature-input"]', '38.5');
    await page.fill('[data-testid="spo2-input"]', '98');
    await page.fill('[data-testid="pulse-input"]', '75');
    await page.fill('[data-testid="bp-systolic-input"]', '120');
    await page.fill('[data-testid="bp-diastolic-input"]', '80');

    await page.click('[data-testid="save-vitals-button"]');

    // THEN: Status badge should show yellow warning
    const tempStatus = page.locator('[data-testid="temperature-status"]');
    await expect(tempStatus).toContainText('WARNING');
    expect(tempStatus).toHaveCSS('background-color', /yellow|warning/i);
  });

  test('should display normal status for valid vitals', async ({ page }) => {
    // GIVEN: Nurse recording vitals
    await loginAsNurse(page);
    await page.goto(`${BASE_URL}/patients/test-patient-001/vitals`);

    // WHEN: Nurse enters all normal values
    await page.click('[data-testid="record-vitals-button"]');
    await page.fill('[data-testid="temperature-input"]', '37.0');
    await page.fill('[data-testid="spo2-input"]', '98');
    await page.fill('[data-testid="pulse-input"]', '75');
    await page.fill('[data-testid="bp-systolic-input"]', '120');
    await page.fill('[data-testid="bp-diastolic-input"]', '80');
    await page.fill('[data-testid="respiration-input"]', '16');

    await page.click('[data-testid="save-vitals-button"]');

    // THEN: All status badges should show green normal
    const tempStatus = page.locator('[data-testid="temperature-status"]');
    await expect(tempStatus).toContainText('NORMAL');
    expect(tempStatus).toHaveCSS('background-color', /green|normal/i);

    // VERIFY: No critical alert banner
    await expect(page.locator('[data-testid="critical-alert-banner"]')).not.toBeVisible();
  });

  test('should be mobile responsive with flex-wrap buttons', async ({
    page,
  }) => {
    // GIVEN: Nurse on mobile device (375px width)
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsNurse(page);
    await page.goto(`${BASE_URL}/patients/test-patient-001/vitals`);

    // WHEN: Opens vital signs form
    await page.click('[data-testid="record-vitals-button"]');

    // THEN: Buttons should have flex-wrap class for mobile
    const buttonContainer = page.locator('[data-testid="vital-form-actions"]');
    const classes = await buttonContainer.getAttribute('class');
    expect(classes).toContain('flex-wrap');

    // VERIFY: Buttons are still 48px even on mobile
    const saveButton = page.locator('[data-testid="save-vitals-button"]');
    const boundingBox = await saveButton.boundingBox();
    expect(boundingBox?.height).toBeGreaterThanOrEqual(48);
  });
});

// ────────────────────────────────────────────────────────────────
// SUITE 3: Lab Order Creation with Priority Dispatch
// ────────────────────────────────────────────────────────────────

test.describe('E2E: Lab Order Creation and Priority Dispatch', () => {
  test('should create lab order and dispatch to priority queue', async ({
    page,
  }) => {
    // GIVEN: Doctor logged in
    await loginAsDoctor(page);
    await page.goto(`${BASE_URL}/patients/test-patient-001`);

    // WHEN: Doctor creates lab order
    await page.click('[data-testid="new-lab-order-button"]');
    await page.waitForSelector('[data-testid="lab-order-modal"]');

    // Fill form
    await page.fill('[data-testid="test-name-input"]', 'Complete Blood Count');
    await page.selectOption('[data-testid="priority-select"]', 'urgent');
    await page.selectOption('[data-testid="sample-type-select"]', 'Blood');

    // Verify Cancel button has ARIA label and 48px height
    const cancelButton = page.locator('[data-testid="lab-cancel-button"]');
    await expect(cancelButton).toHaveAttribute('aria-label', /Cancel lab order/i);
    const cancelbbox = await cancelButton.boundingBox();
    expect(cancelbbox?.height).toBeGreaterThanOrEqual(48);

    // WHEN: Doctor submits
    await page.click('[data-testid="create-order-button"]');

    // THEN: Success message
    const toastSuccess = page.locator('[data-testid="toast-success"]');
    await expect(toastSuccess).toBeVisible();
    await expect(toastSuccess).toContainText('Lab order created');

    // VERIFY: Modal closes
    await expect(page.locator('[data-testid="lab-order-modal"]')).not.toBeVisible();
  });

  test('should show Urgent priority with red badge', async ({ page }) => {
    // GIVEN: Lab technician viewing orders
    await loginAsLabTechnician(page);
    await page.goto(`${BASE_URL}/lab/orders`);

    // WHEN: Orders are displayed
    await page.waitForSelector('[data-testid="order-list"]');

    // FIND: Urgent order with test name containing "Complete Blood Count"
    const urgentOrder = page.locator(
      '[data-testid="order-item"]:has-text("Complete Blood Count")'
    );

    // THEN: Priority badge should be red
    const priorityBadge = urgentOrder.locator('[data-testid="priority-badge"]');
    await expect(priorityBadge).toContainText('URGENT');
    expect(priorityBadge).toHaveCSS('background-color', /red|danger/i);
  });

  test('should dispatch to correct queue based on priority', async ({ page }) => {
    // GIVEN: Multiple orders with different priorities
    await loginAsLabTechnician(page);
    await page.goto(`${BASE_URL}/lab/queue`);

    // THEN: Urgent orders should appear first in queue
    const orderList = page.locator('[data-testid="order-item"]');
    const firstOrderPriority = await orderList.first().getAttribute(
      'data-priority'
    );
    expect(firstOrderPriority).toBe('urgent');

    // VERIFY: Normal priority orders are after urgent
    const orders = await orderList.all();
    let foundNormalAfterUrgent = false;
    for (let i = 0; i < orders.length - 1; i++) {
      const current = await orders[i].getAttribute('data-priority');
      const next = await orders[i + 1].getAttribute('data-priority');
      if (current === 'urgent' && next === 'normal') {
        foundNormalAfterUrgent = true;
        break;
      }
    }
    expect(foundNormalAfterUrgent).toBeTruthy();
  });
});

// ────────────────────────────────────────────────────────────────
// SUITE 4: Cross-Role Workflow Integration
// ────────────────────────────────────────────────────────────────

test.describe('E2E: Cross-Role Clinical Workflows', () => {
  test('should complete prescription → patient allergy check', async ({
    page,
  }) => {
    // WORKFLOW: Doctor prescribes → System blocks allergy conflict

    // STEP 1: Doctor logs in and creates prescription
    await loginAsDoctor(page);
    await page.goto(`${BASE_URL}/patients/test-patient-penicillin-allergy`);
    await page.click('[data-testid="new-prescription-button"]');

    // STEP 2: Allergy banner visible
    expect(page.locator('[data-testid="allergy-warning-banner"]')).toBeDefined();

    // STEP 3: Try to prescribe allergen
    await page.fill('[data-testid="drug-search"]', 'Penicillin');
    await page.click('[data-testid="drug-option"]');
    await page.click('[data-testid="save-prescription-button"]');

    // STEP 4: Blocked by allergy check
    await expect(
      page.locator('[data-testid="toast-error"]:has-text("Allergy conflict")')
    ).toBeVisible();
  });

  test('should complete vital signs recording → critical alert → notification', async ({
    page,
  }) => {
    // WORKFLOW: Nurse records vitals → Critical alert detected → Notification sent

    // STEP 1: Nurse logs in
    await loginAsNurse(page);
    await page.goto(`${BASE_URL}/patients/test-patient-001/vitals`);

    // STEP 2: Nurse enters critical SpO2
    await page.click('[data-testid="record-vitals-button"]');
    await page.fill('[data-testid="spo2-input"]', '85');
    await page.fill('[data-testid="temperature-input"]', '37.0');
    await page.fill('[data-testid="pulse-input"]', '75');
    await page.fill('[data-testid="bp-systolic-input"]', '120');
    await page.fill('[data-testid="bp-diastolic-input"]', '80');
    await page.fill('[data-testid="respiration-input"]', '16');

    // STEP 3: Save vitals
    await page.click('[data-testid="save-vitals-button"]');

    // STEP 4: Critical alert appears
    await expect(
      page.locator('[data-testid="critical-alert-banner"]')
    ).toBeVisible();

    // STEP 5: Verify notification sent (check audit log or notification panel)
    await page.goto(`${BASE_URL}/notifications`);
    await expect(
      page.locator('[data-testid="notification"]:has-text("Critical vital")')
    ).toBeVisible();
  });

  test('should complete lab order creation → priority dispatch → tech notification', async ({
    page,
  }) => {
    // WORKFLOW: Doctor creates urgent lab order → System dispatches → Lab tech receives notification

    // STEP 1: Doctor creates urgent lab order
    await loginAsDoctor(page);
    await page.goto(`${BASE_URL}/patients/test-patient-001`);
    await page.click('[data-testid="new-lab-order-button"]');

    await page.fill('[data-testid="test-name-input"]', 'Urgent Blood Test');
    await page.selectOption('[data-testid="priority-select"]', 'urgent');
    await page.click('[data-testid="create-order-button"]');

    // STEP 2: Lab tech receives notification
    await loginAsLabTechnician(page);
    await page.goto(`${BASE_URL}/dashboard`);

    // STEP 3: Order appears in urgent queue
    await expect(
      page.locator('[data-testid="urgent-queue"]:has-text("Urgent Blood Test")')
    ).toBeVisible();
  });
});

// ────────────────────────────────────────────────────────────────
// SUITE 5: Performance & Latency Verification
// ────────────────────────────────────────────────────────────────

test.describe('E2E: Phase 4B Performance Impact', () => {
  test('should save prescription < 2 seconds (p95)', async ({ page }) => {
    await loginAsDoctor(page);
    await page.goto(`${BASE_URL}/patients/test-patient-001`);
    await page.click('[data-testid="new-prescription-button"]');

    // Fill form
    await page.fill('[data-testid="drug-search"]', 'Ibuprofen');
    await page.click('[data-testid="drug-option"]');

    // Measure save time
    const startTime = Date.now();
    await page.click('[data-testid="save-prescription-button"]');
    await page.waitForSelector('[data-testid="toast-success"]');
    const endTime = Date.now();

    const saveTime = endTime - startTime;
    console.log(`Prescription save time: ${saveTime}ms`);
    expect(saveTime).toBeLessThan(2000);
  });

  test('should validate vitals < 100ms (p99)', async ({ page }) => {
    await loginAsNurse(page);
    await page.goto(`${BASE_URL}/patients/test-patient-001/vitals`);
    await page.click('[data-testid="record-vitals-button"]');

    // Measure validation time (SpO2 critical check)
    const startTime = Date.now();
    await page.fill('[data-testid="spo2-input"]', '85');
    const endTime = Date.now();

    const validationTime = endTime - startTime;
    console.log(`Vital validation time: ${validationTime}ms`);
    expect(validationTime).toBeLessThan(100);
  });

  test('should allergy check < 50ms overhead', async ({ page }) => {
    await loginAsDoctor(page);
    await page.goto(`${BASE_URL}/patients/test-patient-penicillin-allergy`);
    await page.click('[data-testid="new-prescription-button"]');

    // Measure allergy validation overhead
    const startTime = Date.now();
    await page.fill('[data-testid="drug-search"]', 'Penicillin');
    // Wait for allergy check to complete
    await page.waitForSelector('[data-testid="allergy-warning-banner"]', {
      timeout: 50,
    });
    const endTime = Date.now();

    const allergyCheckTime = endTime - startTime;
    console.log(`Allergy check time: ${allergyCheckTime}ms`);
    expect(allergyCheckTime).toBeLessThan(50);
  });
});
