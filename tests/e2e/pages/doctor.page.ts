/**
 * Doctor Page Object Model
 * Handles doctor dashboard, consultation workflow, prescription writing,
 * and lab order interactions following the Page Object Model pattern.
 *
 * Pyramid layer: E2E (10%)
 * Applied: Page Object Model, data-testid selectors, semantic fallbacks
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { TableComponent, NotificationComponent } from './components';

export class DoctorPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get url(): string {
    return '/dashboard';
  }

  // ── Queue / Patient List ─────────────────────────────────────────────────

  get patientQueueTable(): TableComponent {
    return new TableComponent(
      this.page,
      '[data-testid="patient-queue"], table:has-text("Queue"), [data-testid="doctor-queue"]'
    );
  }

  get readyForConsultBadge(): Locator {
    return this.page.locator(
      '[data-testid="ready-for-consult-count"], [data-testid="queue-count"]'
    );
  }

  get patientQueueRows(): Locator {
    return this.page.locator(
      '[data-testid="patient-queue"] tr:not(:first-child), [data-testid="queue-row"]'
    );
  }

  // ── Consultation ──────────────────────────────────────────────────────────

  get startConsultationButton(): Locator {
    return this.page.locator(
      '[data-testid="start-consultation"], button:has-text("Start Consultation")'
    );
  }

  get consultationPanel(): Locator {
    return this.page.locator('[data-testid="consultation-panel"], [data-testid="clinical-workspace"]');
  }

  get chiefComplaintInput(): Locator {
    return this.page.locator(
      '[data-testid="chief-complaint"], textarea[name="chief_complaint"], input[name="chief_complaint"]'
    );
  }

  get clinicalNotesInput(): Locator {
    return this.page.locator(
      '[data-testid="clinical-notes"], textarea[name="clinical_notes"]'
    );
  }

  get diagnosisInput(): Locator {
    return this.page.locator(
      '[data-testid="diagnosis-input"], input[name="diagnosis"], [data-testid="icd-search"]'
    );
  }

  get completeConsultationButton(): Locator {
    return this.page.locator(
      '[data-testid="complete-consultation"], button:has-text("Complete Consultation"), button:has-text("Finish Consultation")'
    );
  }

  // ── Prescriptions ─────────────────────────────────────────────────────────

  get addPrescriptionButton(): Locator {
    return this.page.locator(
      '[data-testid="add-prescription"], button:has-text("Add Prescription"), button:has-text("Write Prescription")'
    );
  }

  get medicationSearchInput(): Locator {
    return this.page.locator(
      '[data-testid="medication-search"], input[placeholder*="medication" i], input[placeholder*="drug" i]'
    );
  }

  get dosageInput(): Locator {
    return this.page.locator('[data-testid="dosage-input"], input[name="dosage"]');
  }

  get frequencySelect(): Locator {
    return this.page.locator(
      '[data-testid="frequency-select"], select[name="frequency"], [data-testid="frequency"]'
    );
  }

  get savePrescriptionButton(): Locator {
    return this.page.locator(
      '[data-testid="save-prescription"], button:has-text("Save Prescription"), button:has-text("Add Medication")'
    );
  }

  get prescriptionsList(): Locator {
    return this.page.locator('[data-testid="prescriptions-list"], [data-testid="medications-list"]');
  }

  // ── Lab Orders ────────────────────────────────────────────────────────────

  get orderLabTestButton(): Locator {
    return this.page.locator(
      '[data-testid="order-lab"], button:has-text("Order Lab"), button:has-text("Request Test")'
    );
  }

  get labTestSearchInput(): Locator {
    return this.page.locator(
      '[data-testid="lab-test-search"], input[placeholder*="test" i], input[placeholder*="lab" i]'
    );
  }

  get labPrioritySelect(): Locator {
    return this.page.locator('[data-testid="lab-priority"], select[name="priority"]');
  }

  get confirmLabOrderButton(): Locator {
    return this.page.locator(
      '[data-testid="confirm-lab-order"], button:has-text("Order Test"), button:has-text("Confirm Order")'
    );
  }

  get labOrdersList(): Locator {
    return this.page.locator('[data-testid="lab-orders-list"]');
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  get notification(): NotificationComponent {
    return new NotificationComponent(this.page);
  }

  // ── Methods ───────────────────────────────────────────────────────────────

  /** Navigate to the doctor's section (defaults to dashboard). */
  async navigateToDoctorDashboard(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Start consultation for the next patient in the queue. */
  async startNextConsultation(): Promise<void> {
    const firstRow = this.patientQueueRows.first();
    await firstRow.waitFor({ state: 'visible', timeout: 10_000 });
    await firstRow.click();
    await this.startConsultationButton.click();
    await this.consultationPanel.waitFor({ state: 'visible', timeout: 10_000 });
  }

  /** Fill in the chief complaint. */
  async fillChiefComplaint(complaint: string): Promise<void> {
    await this.chiefComplaintInput.waitFor({ state: 'visible' });
    await this.chiefComplaintInput.fill(complaint);
  }

  /** Write a prescription during an active consultation. */
  async writePrescription(medication: string, dosage: string): Promise<void> {
    await this.addPrescriptionButton.click();
    await this.medicationSearchInput.fill(medication);
    // Wait for autocomplete suggestion
    const suggestion = this.page.locator(
      `[data-testid="medication-option"]:has-text("${medication}"), li:has-text("${medication}")`
    ).first();
    if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
      await suggestion.click();
    }
    if (await this.dosageInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.dosageInput.fill(dosage);
    }
    await this.savePrescriptionButton.click();
  }

  /** Order a lab test during an active consultation. */
  async orderLabTest(testName: string, priority: 'routine' | 'urgent' | 'stat' = 'routine'): Promise<void> {
    await this.orderLabTestButton.click();
    await this.labTestSearchInput.fill(testName);
    const suggestion = this.page.locator(
      `[data-testid="lab-test-option"]:has-text("${testName}"), li:has-text("${testName}")`
    ).first();
    if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
      await suggestion.click();
    }
    if (await this.labPrioritySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.labPrioritySelect.selectOption(priority);
    }
    await this.confirmLabOrderButton.click();
  }

  /** Complete the current consultation. */
  async completeConsultation(): Promise<void> {
    await this.completeConsultationButton.waitFor({ state: 'visible', timeout: 10_000 });
    await this.completeConsultationButton.click();
    // Confirm modal if present
    const confirmBtn = this.page.locator('button:has-text("Confirm"), [data-testid="confirm-complete"]');
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }
  }

  /** Assert the queue shows at least one patient. */
  async expectPatientsInQueue(minCount = 1): Promise<void> {
    await expect(this.patientQueueRows.first()).toBeVisible({ timeout: 15_000 });
    const count = await this.patientQueueRows.count();
    expect(count).toBeGreaterThanOrEqual(minCount);
  }

  /** Assert a success toast is shown after completing a consultation. */
  async expectConsultationCompleted(): Promise<void> {
    const toast = this.page.locator(
      '[data-sonner-toast][data-type="success"], [data-testid="success-toast"], .toast-success'
    );
    await expect(toast.first()).toBeVisible({ timeout: 10_000 });
  }
}
