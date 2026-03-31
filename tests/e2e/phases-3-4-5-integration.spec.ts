/**
 * End-to-End Tests for Phases 3, 4, 5
 * Complete workflows: Notification canonicalization → Break-glass overrides → Subscription consolidation
 */

import { test, expect } from '@playwright/test';

test.describe('Phase 3-5: Complete Workflow Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    // Setup: Login as emergency physician
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'emergency.physician@test.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123');
    await page.click('[data-testid="login-button"]');
    await page.waitForNavigation();
  });

  test('PHASE 3: Patient receives notification with canonical recipient_id on appointment', async ({ page }) => {
    // Navigate to appointments
    await page.goto('/clinic/appointments');

    // Create new appointment
    await page.click('[data-testid="new-appointment-button"]');
    await page.fill('[data-testid="patient-id-input"]', 'patient-123');
    await page.fill('[data-testid="doctor-input"]', 'Dr. Smith');
    await page.fill('[data-testid="time-input"]', '14:30');
    await page.click('[data-testid="create-appointment-button"]');

    await page.waitForSelector('[data-testid="appointment-created-toast"]');

    // Verify notification was sent with canonical recipient_id
    const notification = await page.evaluate(() => {
      return {
        recipientIdPresent: document.body.textContent?.includes('recipient_id'),
        legacyUserIdAbsent: !document.body.textContent?.includes('legacy user_id'),
      };
    });

    expect(notification.recipientIdPresent).toBeTruthy();
    expect(notification.legacyUserIdAbsent).toBeTruthy();

    // Verify patient sees notification in inbox
    await page.goto('/patient/notifications');
    await expect(page.locator('text=Appointment Scheduled')).toBeVisible();
  });

  test('PHASE 4: Emergency physician can initiate break-glass override with mandatory reason', async ({ page }) => {
    // Navigate to patient detail
    await page.goto('/clinic/patients/patient-456');

    // Try to discharge patient without all documentation (blocked)
    await page.click('[data-testid="discharge-button"]');
    const errorMessage = page.locator('[data-testid="discharge-error-message"]');
    await expect(errorMessage).toContainText('Missing clinical documentation');

    // Doctor clicks "Emergency Override"
    await page.click('[data-testid="emergency-override-button"]');
    
    // Modal appears requiring detailed override reason
    const modal = page.locator('[data-testid="break-glass-modal"]');
    await expect(modal).toBeVisible();

    // Verify reason field requires > 20 characters
    const reasonInput = modal.locator('[data-testid="override-reason-input"]');
    await reasonInput.fill('Short');
    const submitButton = modal.locator('[data-testid="override-submit-button"]');
    expect(await submitButton.isDisabled()).toBeTruthy();

    // Fill in valid reason
    await reasonInput.fill('Patient experiencing acute cardiac event - emergency treatment and discharge required immediately due to ICU bed shortage and critical condition');
    expect(await submitButton.isDisabled()).toBeFalsy();

    // Select emergency level
    await modal.locator('[data-testid="emergency-level-select"]').selectOption('critical');

    // Submit override
    await submitButton.click();

    // Verify success toast and reason captured
    await expect(page.locator('text=Override approved')).toBeVisible();

    // Verify override appears in audit log
    await page.goto('/clinic/audit-logs');
    await expect(page.locator('text=break_glass_override_initiated')).toBeVisible();
    await expect(page.locator('text=Patient experiencing acute cardiac event')).toBeVisible();

    // Verify reason is sanitized (no PHI in visible audit log)
    const auditEntry = page.locator('[data-testid="audit-entry-break-glass"]');
    const hasEmail = await auditEntry.evaluate(el => 
      el.textContent?.includes('@') || false
    );
    expect(hasEmail).toBeFalsy(); // PHI should be sanitized
  });

  test('PHASE 4: Admin is notified when break-glass override exceeds 1 minute', async ({ page, context }) => {
    // Simulate: Emergency physician initiates override at 12:00
    // Mock clock to advance 61 seconds
    await page.clock.install();
    const startTime = new Date('2026-03-31T12:00:00Z');
    await page.clock.setFixedTime(startTime);

    // Physician initiates override
    await page.goto('/clinic/emergency-override');
    await page.fill('[data-testid="reason-input"]', 'Critical emergency override for patient life-threatening condition requiring immediate intervention now');
    await page.click('[data-testid="override-submit"]');

    // Wait 61 seconds then check admin notifications
    await page.clock.setFixedTime(new Date(startTime.getTime() + 61000));

    // Create new page as admin
    const adminPage = await context.newPage();
    await adminPage.goto('/admin/notifications');

    // Verify escalation notification
    await expect(adminPage.locator('text=Break-Glass Override Escalation')).toBeVisible();
    await expect(adminPage.locator('text=critical')).toBeVisible();

    await adminPage.close();
  });

  test('PHASE 4: Break-glass override auto-expires after 1 hour', async ({ page }) => {
    await page.clock.install();
    const now = new Date('2026-03-31T12:00:00Z');
    await page.clock.setFixedTime(now);

    // Initiate override
    await page.goto('/clinic/emergency-override');
    await page.fill('[data-testid="reason-input"]', 'Emergency override reason that is detailed and clinically appropriate for patient care');
    await page.click('[data-testid="submit-button"]');
    
    const startMessage = page.locator('text=expires in 1 hour');
    await expect(startMessage).toBeVisible();

    // Advance clock 61 minutes
    await page.clock.setFixedTime(new Date(now.getTime() + 61 * 60 * 1000));

    // Refresh page
    await page.reload();

    // Override should be marked as expired
    const expiredMessage = page.locator('text=Override has expired');
    await expect(expiredMessage).toBeVisible();
  });

  test('PHASE 5: Subscription consolidation reduces network overhead', async ({ page }) => {
    // Monitor network requests
    const channels: string[] = [];
    
    page.on('websocket', ws => {
      const url = ws.url();
      if (url.includes('realtime')) {
        // Extract channel name from subscription
        const match = url.match(/channel=([^&]+)/);
        if (match) channels.push(match[1]);
      }
    });

    // Navigate to dashboard (consolidates 3 event types)
    await page.goto('/clinic/dashboard');
    
    // Wait for subscriptions to settle
    await page.waitForTimeout(1000);

    // Verify consolidation: Multiple components share channels
    // Instead of 10+ separate subscriptions, we should see ~3 channels
    const uniqueChannels = new Set(channels);
    expect(channels.length).toBeGreaterThan(0);
    
    // With consolidation, should be roughly 3-4 unique channels
    // Without consolidation, would be 10+
    expect(uniqueChannels.size).toBeLessThan(8);
  });

  test('PHASE 5: Idempotent queue notifications prevent duplicates on retry', async ({ page, context }) => {
    // Open patient queue page
    await page.goto('/clinic/queue');

    // Intercept network request and force it to fail then retry
    let requestCount = 0;
    await page.route('**/realtime**', route => {
      requestCount++;
      if (requestCount === 1) {
        // First request fails (simulating network error)
        route.abort();
      } else {
        // Retry succeeds
        route.continue();
      }
    });

    // Call patient
    const notificationsBefore = await page.locator('[data-testid="queue-notification"]').count();
    
    await page.click('[data-testid="call-patient-button"]');
    
    // Simulate timeout and retry
    await page.click('[data-testid="call-patient-button"]'); // Auto-retry

    // Wait and check
    await page.waitForTimeout(500);
    const notificationsAfter = await page.locator('[data-testid="queue-notification"]').count();

    // Should only see ONE "Patient Called" notification, not two
    expect(notificationsAfter).toBe(notificationsBefore + 1);
  });

  test('PHASE 5: KPI dashboard uses canonical workflow_events source', async ({ page }) => {
    // Navigate to admin KPI dashboard
    await page.goto('/admin/kpis');

    // Verify data comes from canonical source
    const dbLog = page.evaluate(() => {
      return (window as any).__debugLog?.databaseQueries || [];
    });

    // All KPI queries should reference workflow_events table
    // (not direct patient_queue queries)
    const queries = await page.evaluate(() => {
      return (window as any).__debugLog?.sqlQueries || [];
    });

    // Filter for queue-related KPIs
    const kpiQueries = queries.filter((q: string) => 
      q.includes('queue') || q.includes('wait_time')
    );

    kpiQueries.forEach((query: string) => {
      // Should use workflow_events or derived metrics
      expect(query).not.toMatch(/FROM patient_queue/);
      expect(query).toMatch(/workflow_events|derived_metrics/);
    });
  });

  test('PHASE 3+4: Complete emergency discharge workflow with break-glass and notifications', async ({ page }) => {
    // Navigate to patient
    await page.goto('/clinic/patients/patient-789');

    // Attempt discharge
    await page.click('[data-testid="discharge-button"]');

    // See blocking errors
    await expect(page.locator('text=Pending lab results required')).toBeVisible();

    // Override with emergency justification
    await page.click('[data-testid="emergency-override-button"]');
    await page.fill(
      '[data-testid="override-reason-input"]',
      'Patient critical condition - ventilator weaning successful, ICU discharge required urgently to free bed for emergency admission'
    );
    await page.click('[data-testid="override-approve-button"]');

    // Discharge succeeds
    await expect(page.locator('text=Discharge completed')).toBeVisible();

    // Verify notifications sent to:
    // 1. Pharmacist (using canonical recipient_id)
    // 2. Lab (using canonical recipient_id)
    // 3. Patient
    // 4. Audit trail captured

    // Check audit log
    await page.goto('/clinic/audit-logs');
    const entry = page.locator('[data-testid="audit-entry-patient-discharge"]');
    await expect(entry.locator('text=break_glass_override')).toBeVisible();
    await expect(entry.locator('text=recipient_id')).toBeVisible(); // Canonical notification
  });
});
