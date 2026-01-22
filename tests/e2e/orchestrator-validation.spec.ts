import { test, expect } from '@playwright/test';
import { setTestRole, loginAsTestUser, TEST_DATA } from './utils/test-helpers';

/**
 * PHASE 7: ORCHESTRATION VALIDATION
 * This test verifies the end-to-end event-driven workflow:
 * 1. Receptionist checks in a patient.
 * 2. Workflow Orchestrator detects the event.
 * 3. Workflow Rule triggers a task for the Nurse.
 * 4. Nurse sees the task in real-time.
 */

test.describe('Clinical Workflow Orchestration', () => {
  
  test.beforeEach(async ({ page }) => {
    // Start by logging in as admin to ensure environment is clean or use default test user
    await loginAsTestUser(page, 'admin');
  });

  test('should trigger automated nurse task upon patient check-in', async ({ page }) => {
    // 1. Switch to Receptionist Role
    await setTestRole(page, 'receptionist');
    await page.goto('/dashboard');
    
    // Navigate to Queue/Check-in
    await page.click('text=Receptionist Portal');
    await page.click('text=Patient Queue');
    
    // Find a patient and check them in
    // Note: Assuming there's at least one patient in the 'scheduled' state
    const patientRow = page.locator('tr:has-text("Waiting")').first();
    await expect(patientRow).toBeVisible();
    
    const patientName = await patientRow.locator('td').first().textContent();
    console.log(`Checking in patient: ${patientName}`);
    
    await patientRow.getByRole('button', { name: /check in/i }).click();
    
    // Success notification should appear
    await expect(page.locator('text=Patient checked in successfully')).toBeVisible();

    // 2. Switch to Nurse Role to verify task creation
    await setTestRole(page, 'nurse');
    await page.goto('/dashboard');
    
    // Navigate to Task Center or Nurse Dashboard
    await page.click('text=Nurse Portal');
    
    // Verify that a task created by the orchestrator is visible
    // The rule in migration 20260124000003_phase6_orchestration_rules.sql defines:
    // message: "Complete pre-consultation prep for patient"
    const taskLocator = page.locator('text=Complete pre-consultation prep for patient').first();
    
    // Give it a few seconds for the async orchestrator and real-time update to fire
    await expect(taskLocator).toBeVisible({ timeout: 10000 });
    
    console.log(`✓ Workflow task successfully verified for Nurse: ${patientName}`);
    
    // 3. Verify task details
    await taskLocator.click();
    await expect(page.locator('text=Automated task: patient_check_in')).toBeVisible();
    await expect(page.locator('text=vitals_required')).toBeVisible();
  });

  test('should notify doctor when triage is completed', async ({ page }) => {
    // 1. Switch to Nurse Role
    await setTestRole(page, 'nurse');
    await page.goto('/dashboard/nurse');
    
    // Find the triage task and "complete" it
    const triageButton = page.getByRole('button', { name: /start triage/i }).first();
    await expect(triageButton).toBeVisible();
    await triageButton.click();
    
    // Fill vitals
    await page.fill('input[name="bloodPressure"]', '120/80');
    await page.fill('input[name="heartRate"]', '72');
    await page.click('button:has-text("Submit Triage")');
    
    await expect(page.locator('text=Triage completed')).toBeVisible();

    // 2. Switch to Doctor Role
    await setTestRole(page, 'doctor');
    await page.goto('/dashboard');
    
    // Check for notification in the UI
    const notificationIcon = page.locator('[data-testid="notification-bell"]');
    await expect(notificationIcon).toBeVisible();
    
    // Open notifications
    await notificationIcon.click();
    
    // The rule defines: message: "Patient vitals and triage are complete. Ready for consultation."
    await expect(page.locator('text=Ready for consultation')).toBeVisible({ timeout: 10000 });
    
    console.log('✓ Doctor notification verified successfully');
  });
});
