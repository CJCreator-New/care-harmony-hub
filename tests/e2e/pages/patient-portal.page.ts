/**
 * Patient Portal Page Object Model
 * Handles patient self-service portal: appointments, prescriptions,
 * lab results, and secure messaging.
 *
 * Pyramid layer: E2E (10%)
 * Applied: Page Object Model, data-testid selectors, semantic fallbacks
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { TableComponent, NotificationComponent } from './components';

export class PatientPortalPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get url(): string {
    return '/patient/portal';
  }

  // ── Portal Navigation ─────────────────────────────────────────────────────

  get appointmentsTab(): Locator {
    return this.page.locator(
      '[data-testid="tab-appointments"], a:has-text("Appointments"), button:has-text("Appointments")'
    );
  }

  get prescriptionsTab(): Locator {
    return this.page.locator(
      '[data-testid="tab-prescriptions"], a:has-text("Prescriptions"), button:has-text("Prescriptions"), a:has-text("Medications")'
    );
  }

  get labResultsTab(): Locator {
    return this.page.locator(
      '[data-testid="tab-lab-results"], a:has-text("Lab Results"), button:has-text("Lab Results"), a:has-text("Test Results")'
    );
  }

  get messagesTab(): Locator {
    return this.page.locator(
      '[data-testid="tab-messages"], a:has-text("Messages"), button:has-text("Messages")'
    );
  }

  // ── Appointments ──────────────────────────────────────────────────────────

  get bookAppointmentButton(): Locator {
    return this.page.locator(
      '[data-testid="book-appointment"], button:has-text("Book Appointment"), button:has-text("New Appointment"), a:has-text("Book Appointment")'
    );
  }

  get appointmentsList(): TableComponent {
    return new TableComponent(
      this.page,
      '[data-testid="appointments-list"], table:has-text("Appointment"), [data-testid="appointment-table"]'
    );
  }

  get upcomingAppointmentRows(): Locator {
    return this.page.locator(
      '[data-testid="appointment-row"], tr:has([data-status="upcoming"]), tr:has([data-status="scheduled"])'
    );
  }

  get doctorSelect(): Locator {
    return this.page.locator(
      '[data-testid="select-doctor"], select[name="doctor_id"], [data-testid="doctor-select"]'
    );
  }

  get appointmentDatePicker(): Locator {
    return this.page.locator(
      '[data-testid="appointment-date"], input[type="date"], input[name="appointment_date"]'
    );
  }

  get appointmentTimePicker(): Locator {
    return this.page.locator(
      '[data-testid="appointment-time"], select[name="appointment_time"], input[name="appointment_time"]'
    );
  }

  get appointmentReasonInput(): Locator {
    return this.page.locator(
      '[data-testid="appointment-reason"], textarea[name="reason"], input[name="reason_for_visit"]'
    );
  }

  get confirmBookingButton(): Locator {
    return this.page.locator(
      '[data-testid="confirm-booking"], button:has-text("Confirm"), button:has-text("Book"), button[type="submit"]'
    );
  }

  get cancelAppointmentButton(): Locator {
    return this.page.locator(
      '[data-testid="cancel-appointment"], button:has-text("Cancel Appointment")'
    ).first();
  }

  // ── Prescriptions ─────────────────────────────────────────────────────────

  get prescriptionsList(): Locator {
    return this.page.locator(
      '[data-testid="prescriptions-list"], [data-testid="medications-list"]'
    );
  }

  get refillRequestButton(): Locator {
    return this.page.locator(
      '[data-testid="request-refill"], button:has-text("Request Refill")'
    ).first();
  }

  // ── Lab Results ───────────────────────────────────────────────────────────

  get labResultRows(): Locator {
    return this.page.locator('[data-testid="lab-result-row"], tr:has([data-testid="lab-result"])');
  }

  get flaggedResultRows(): Locator {
    return this.page.locator('[data-testid="flagged-result"], [data-status="abnormal"]');
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  get notification(): NotificationComponent {
    return new NotificationComponent(this.page);
  }

  // ── Methods ───────────────────────────────────────────────────────────────

  /** Navigate to the patient portal home. */
  async navigateToPortal(): Promise<void> {
    await this.page.goto(this.url);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Click the Appointments tab. */
  async openAppointments(): Promise<void> {
    await this.appointmentsTab.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Click the Prescriptions tab. */
  async openPrescriptions(): Promise<void> {
    await this.prescriptionsTab.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Click the Lab Results tab. */
  async openLabResults(): Promise<void> {
    await this.labResultsTab.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Book a new appointment.
   * @param date  - ISO date string (YYYY-MM-DD)
   * @param time  - time string (HH:MM)
   * @param reason - reason for visit
   */
  async bookAppointment(date: string, time: string, reason: string): Promise<void> {
    await this.bookAppointmentButton.click();
    await this.appointmentDatePicker.fill(date);
    if (await this.appointmentTimePicker.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.appointmentTimePicker.fill(time);
    }
    await this.appointmentReasonInput.fill(reason);
    await this.confirmBookingButton.click();
  }

  /** Cancel the first upcoming appointment. */
  async cancelFirstAppointment(): Promise<void> {
    await this.openAppointments();
    await this.cancelAppointmentButton.waitFor({ state: 'visible', timeout: 10_000 });
    await this.cancelAppointmentButton.click();
    // Confirm dialog if present
    const confirmBtn = this.page.locator('button:has-text("Yes"), [data-testid="confirm-cancel"]');
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }
  }

  /** Request a refill for the first listed prescription. */
  async requestFirstRefill(): Promise<void> {
    await this.openPrescriptions();
    await this.refillRequestButton.waitFor({ state: 'visible', timeout: 10_000 });
    await this.refillRequestButton.click();
  }

  /** Assert portal page is accessible (key tabs visible). */
  async expectPortalLoaded(): Promise<void> {
    await expect(this.appointmentsTab).toBeVisible({ timeout: 15_000 });
  }

  /** Assert a booking success toast is visible. */
  async expectBookingConfirmed(): Promise<void> {
    const toast = this.page.locator(
      '[data-sonner-toast][data-type="success"], [data-testid="booking-success"], .toast-success'
    );
    await expect(toast.first()).toBeVisible({ timeout: 10_000 });
  }

  /** Assert the lab results list is not empty. */
  async expectLabResultsVisible(minResults = 1): Promise<void> {
    await this.openLabResults();
    await expect(this.labResultRows.first()).toBeVisible({ timeout: 10_000 });
    const count = await this.labResultRows.count();
    expect(count).toBeGreaterThanOrEqual(minResults);
  }
}
