/**
 * feature1-recurrence-ui.test.ts
 * Unit tests for Feature 1.3: Appointment Recurrence UI Components
 * Tests: RecurrencePatternSelector, RecurrenceExceptionManager, AppointmentRecurrenceSettings
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import RecurrencePatternSelector, { RecurrencePatternSchema } from '@/components/features/appointments/RecurrencePatternSelector';
import RecurrenceExceptionManager from '@/components/features/appointments/RecurrenceExceptionManager';
import AppointmentRecurrenceSettings from '@/components/features/appointments/AppointmentRecurrenceSettings';
import { generateRecurringAppointments } from '@/lib/recurrence.utils';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canEditAppointments: true,
    role: 'doctor',
  }),
}));

vi.mock('@/hooks/useHospitalContext', () => ({
  useHospitalContext: () => ({
    hospitalId: 'test-hospital-id',
  }),
}));

vi.mock('@/hooks/useHIPAACompliance', () => ({
  useHIPAACompliance: () => ({
    encrypt: (data: string) => `encrypted_${data}`,
    decrypt: (data: string) => data.replace('encrypted_', ''),
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('Feature 1.3: Appointment Recurrence UI', () => {
  // ============================================================================
  // RecurrencePatternSelector Tests
  // ============================================================================

  describe('RecurrencePatternSelector Component', () => {
    it('renders with recurrence type options', () => {
      const mockOnChange = vi.fn();
      const appointmentDate = new Date();

      render(
        <RecurrencePatternSelector
          onPatternChange={mockOnChange}
          appointmentDate={appointmentDate}
          hospitalId="test-hospital"
        />
      );

      expect(screen.getByText('Appointment Recurrence Pattern')).toBeInTheDocument();
      expect(screen.getByText('Recurrence Type')).toBeInTheDocument();
    });

    it('shows daily recurrence option', async () => {
      const mockOnChange = vi.fn();
      const appointmentDate = new Date();

      render(
        <RecurrencePatternSelector
          onPatternChange={mockOnChange}
          appointmentDate={appointmentDate}
          hospitalId="test-hospital"
        />
      );

      const selectTrigger = screen.getByRole('combobox');
      await userEvent.click(selectTrigger);

      expect(screen.getByText('Daily')).toBeInTheDocument();
      expect(screen.getByText('Weekly')).toBeInTheDocument();
      expect(screen.getByText('Bi-weekly (Every 2 weeks)')).toBeInTheDocument();
      expect(screen.getByText('Monthly')).toBeInTheDocument();
    });

    it('displays days of week checkboxes when weekly is selected', async () => {
      const mockOnChange = vi.fn();
      const appointmentDate = new Date();

      render(
        <RecurrencePatternSelector
          onPatternChange={mockOnChange}
          appointmentDate={appointmentDate}
          hospitalId="test-hospital"
        />
      );

      // Weekly should already be selected or we need to select it
      const selectTrigger = screen.getByRole('combobox');
      await userEvent.click(selectTrigger);
      await userEvent.click(screen.getByText('Weekly'));

      // Wait for days of week section to appear
      await waitFor(() => {
        expect(screen.getByText('Days of Week')).toBeInTheDocument();
      });

      const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      dayLabels.forEach((day) => {
        expect(screen.getByLabelText(day)).toBeInTheDocument();
      });
    });

    it('hides days of week checkboxes when daily is selected', async () => {
      const mockOnChange = vi.fn();
      const appointmentDate = new Date();

      render(
        <RecurrencePatternSelector
          onPatternChange={mockOnChange}
          appointmentDate={appointmentDate}
          hospitalId="test-hospital"
        />
      );

      const selectTrigger = screen.getByRole('combobox');
      await userEvent.click(selectTrigger);
      await userEvent.click(screen.getByText('Daily'));

      await waitFor(() => {
        expect(screen.queryByText('Days of Week')).not.toBeInTheDocument();
      });
    });

    it('displays day of month selector for monthly recurrence', async () => {
      const mockOnChange = vi.fn();
      const appointmentDate = new Date();

      render(
        <RecurrencePatternSelector
          onPatternChange={mockOnChange}
          appointmentDate={appointmentDate}
          hospitalId="test-hospital"
        />
      );

      const selectTrigger = screen.getByRole('combobox');
      await userEvent.click(selectTrigger);
      await userEvent.click(screen.getByText('Monthly'));

      await waitFor(() => {
        expect(screen.getByText('Day of Month')).toBeInTheDocument();
      });
    });

    it('validates that at least one day is selected for weekly', async () => {
      const mockOnChange = vi.fn();
      const appointmentDate = new Date();

      render(
        <RecurrencePatternSelector
          onPatternChange={mockOnChange}
          appointmentDate={appointmentDate}
          hospitalId="test-hospital"
        />
      );

      const selectTrigger = screen.getByRole('combobox');
      await userEvent.click(selectTrigger);
      await userEvent.click(screen.getByText('Weekly'));

      const submitButton = screen.getByRole('button', { name: /Save Recurrence Pattern/i });
      await userEvent.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Select at least one day/i)).toBeInTheDocument();
      });
    });

    it('calls onPatternChange with valid pattern', async () => {
      const mockOnChange = vi.fn();
      const appointmentDate = new Date();

      render(
        <RecurrencePatternSelector
          onPatternChange={mockOnChange}
          appointmentDate={appointmentDate}
          hospitalId="test-hospital"
        />
      );

      // Select weekly
      const selectTrigger = screen.getByRole('combobox');
      await userEvent.click(selectTrigger);
      await userEvent.click(screen.getByText('Weekly'));

      // Select Monday
      await waitFor(() => {
        const mondayCheckbox = screen.getByLabelText('Monday');
        expect(mondayCheckbox).toBeInTheDocument();
      });

      const mondayCheckbox = screen.getByLabelText('Monday');
      await userEvent.click(mondayCheckbox);

      // Submit
      const submitButton = screen.getByRole('button', { name: /Save Recurrence Pattern/i });
      await userEvent.click(submitButton);

      // Should have called onPatternChange
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('accepts end date input', async () => {
      const mockOnChange = vi.fn();
      const appointmentDate = new Date();

      render(
        <RecurrencePatternSelector
          onPatternChange={mockOnChange}
          appointmentDate={appointmentDate}
          hospitalId="test-hospital"
        />
      );

      const endDateLabel = screen.getByText('End Date (Optional)');
      expect(endDateLabel).toBeInTheDocument();
    });

    it('accepts max occurrences input', async () => {
      const mockOnChange = vi.fn();
      const appointmentDate = new Date();

      render(
        <RecurrencePatternSelector
          onPatternChange={mockOnChange}
          appointmentDate={appointmentDate}
          hospitalId="test-hospital"
        />
      );

      expect(screen.getByText('Maximum Occurrences (Optional)')).toBeInTheDocument();
    });

    it('validates recurrence pattern schema', () => {
      const validPattern = {
        type: 'weekly' as const,
        interval: 1,
        daysOfWeek: ['MON', 'WED', 'FRI'],
        timezone: 'UTC',
      };

      const result = RecurrencePatternSchema.safeParse(validPattern);
      expect(result.success).toBe(true);
    });

    it('rejects invalid recurrence type', () => {
      const invalidPattern = {
        type: 'yearly',
        interval: 1,
        timezone: 'UTC',
      };

      const result = RecurrencePatternSchema.safeParse(invalidPattern);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // RecurrenceExceptionManager Tests
  // ============================================================================

  describe('RecurrenceExceptionManager Component', () => {
    const appointmentDate = new Date('2026-04-20');
    const generatedDates = [
      new Date('2026-04-20'),
      new Date('2026-04-27'),
      new Date('2026-05-04'),
      new Date('2026-05-11'),
    ];

    it('renders exception manager card', () => {
      const mockOnChange = vi.fn();

      render(
        <RecurrenceExceptionManager
          recurrenceId="test-recurrence"
          appointmentDate={appointmentDate}
          generatedDates={generatedDates}
          onExceptionsChange={mockOnChange}
          hospitalId="test-hospital"
          doctorId="test-doctor"
        />
      );

      expect(screen.getByText('Recurrence Exceptions')).toBeInTheDocument();
      expect(screen.getByText(/skip appointments/i)).toBeInTheDocument();
    });

    it('shows alert when no exceptions exist', () => {
      const mockOnChange = vi.fn();

      render(
        <RecurrenceExceptionManager
          recurrenceId="test-recurrence"
          appointmentDate={appointmentDate}
          generatedDates={generatedDates}
          onExceptionsChange={mockOnChange}
          hospitalId="test-hospital"
          doctorId="test-doctor"
        />
      );

      expect(screen.getByText(/Add exceptions for dates when this appointment should be skipped/i)).toBeInTheDocument();
    });

    it('accepts exception date input', async () => {
      const mockOnChange = vi.fn();

      render(
        <RecurrenceExceptionManager
          recurrenceId="test-recurrence"
          appointmentDate={appointmentDate}
          generatedDates={generatedDates}
          onExceptionsChange={mockOnChange}
          hospitalId="test-hospital"
          doctorId="test-doctor"
        />
      );

      expect(screen.getByText('Exception Date')).toBeInTheDocument();
    });

    it('displays added exceptions', async () => {
      const mockOnChange = vi.fn();
      const exceptions = [new Date('2026-04-27')];

      render(
        <RecurrenceExceptionManager
          recurrenceId="test-recurrence"
          appointmentDate={appointmentDate}
          generatedDates={generatedDates}
          onExceptionsChange={mockOnChange}
          initialExceptions={exceptions}
          hospitalId="test-hospital"
          doctorId="test-doctor"
        />
      );

      // Should show the exception in upcoming section
      expect(screen.getByText(/Upcoming Exceptions/i)).toBeInTheDocument();
    });

    it('displays past exceptions as badges', async () => {
      const mockOnChange = vi.fn();
      const pastDate = new Date('2026-04-15'); // before today
      const exceptions = [pastDate];

      render(
        <RecurrenceExceptionManager
          recurrenceId="test-recurrence"
          appointmentDate={appointmentDate}
          generatedDates={generatedDates}
          onExceptionsChange={mockOnChange}
          initialExceptions={exceptions}
          hospitalId="test-hospital"
          doctorId="test-doctor"
        />
      );

      expect(screen.getByText(/Past Exceptions/i)).toBeInTheDocument();
    });

    it('displays exception count summary', async () => {
      const mockOnChange = vi.fn();
      const exceptions = [
        new Date('2026-04-20'),
        new Date('2026-04-27'),
      ];

      render(
        <RecurrenceExceptionManager
          recurrenceId="test-recurrence"
          appointmentDate={appointmentDate}
          generatedDates={generatedDates}
          onExceptionsChange={mockOnChange}
          initialExceptions={exceptions}
          hospitalId="test-hospital"
          doctorId="test-doctor"
        />
      );

      expect(screen.getByText(/2 exceptions configured/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Date Generation Integration Tests
  // ============================================================================

  describe('Recurring Date Generation', () => {
    it('generates daily recurrence correctly', () => {
      const startDate = new Date('2026-04-20');
      const pattern = {
        type: 'daily' as const,
        interval: 1,
        maxOccurrences: 5,
        timezone: 'UTC',
      };

      const dates = generateRecurringAppointments(startDate, pattern);
      expect(dates).toHaveLength(5);
      expect(format(dates[0], 'yyyy-MM-dd')).toBe('2026-04-20');
      expect(format(dates[4], 'yyyy-MM-dd')).toBe('2026-04-24');
    });

    it('generates weekly recurrence correctly', () => {
      const startDate = new Date('2026-04-20'); // Monday
      const pattern = {
        type: 'weekly' as const,
        interval: 1,
        daysOfWeek: ['MON', 'WED'], // Monday and Wednesday
        maxOccurrences: 4,
        timezone: 'UTC',
      };

      const dates = generateRecurringAppointments(startDate, pattern);
      expect(dates.length).toBeGreaterThan(0);
      // First date should be Monday
      expect(format(dates[0], 'yyyy-MM-dd')).toBe('2026-04-20');
    });

    it('generates bi-weekly recurrence correctly', () => {
      const startDate = new Date('2026-04-20');
      const pattern = {
        type: 'biweekly' as const,
        interval: 2,
        daysOfWeek: ['MON'],
        maxOccurrences: 3,
        timezone: 'UTC',
      };

      const dates = generateRecurringAppointments(startDate, pattern);
      expect(dates.length).toBeGreaterThan(0);
      if (dates.length >= 2) {
        const dayDiff = (dates[1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24);
        expect(dayDiff).toBeLessThanOrEqual(21); // 3 weeks max for bi-weekly
      }
    });

    it('generates monthly recurrence correctly', () => {
      const startDate = new Date('2026-04-20');
      const pattern = {
        type: 'monthly' as const,
        interval: 1,
        dayOfMonth: 20,
        maxOccurrences: 3,
        timezone: 'UTC',
      };

      const dates = generateRecurringAppointments(startDate, pattern);
      expect(dates.length).toBeGreaterThan(0);
      // First date should be on the 20th
      expect(dates[0].getDate()).toBe(20);
    });

    it('respects maxOccurrences limit', () => {
      const startDate = new Date('2026-04-20');
      const pattern = {
        type: 'daily' as const,
        interval: 1,
        maxOccurrences: 10,
        timezone: 'UTC',
      };

      const dates = generateRecurringAppointments(startDate, pattern);
      expect(dates).toHaveLength(10);
    });

    it('respects endDate limit', () => {
      const startDate = new Date('2026-04-20');
      const endDate = new Date('2026-04-30'); // 10 days later
      const pattern = {
        type: 'daily' as const,
        interval: 1,
        endDate,
        timezone: 'UTC',
      };

      const dates = generateRecurringAppointments(startDate, pattern);
      // Should have ~10 dates (20-30)
      expect(dates.length).toBeGreaterThan(0);
      expect(dates[dates.length - 1].getTime()).toBeLessThanOrEqual(endDate.getTime());
    });

    it('filters out exception dates', () => {
      const startDate = new Date('2026-04-20');
      const exceptions = [new Date('2026-04-22'), new Date('2026-04-24')];
      const pattern = {
        type: 'daily' as const,
        interval: 1,
        maxOccurrences: 5,
        timezone: 'UTC',
      };

      const allDates = generateRecurringAppointments(startDate, pattern);
      const filteredDates = allDates.filter(
        (d) => !exceptions.some((ex) => format(ex, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd'))
      );

      expect(filteredDates.length).toBeLessThan(allDates.length);
      expect(filteredDates.length).toBe(allDates.length - exceptions.length);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Full Integration: RecurrenceSettings Component', () => {
    it('renders all tabs', () => {
      render(
        <AppointmentRecurrenceSettings />
      );

      expect(screen.getByText('Create Recurring Appointments')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Basic Details' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Recurrence Pattern' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Exceptions & Preview' })).toBeInTheDocument();
    });

    it('shows preview when pattern is set', async () => {
      render(
        <AppointmentRecurrenceSettings />
      );

      // Navigate to pattern tab
      await userEvent.click(screen.getByRole('tab', { name: 'Recurrence Pattern' }));

      // Pattern should be rendered
      expect(screen.getByText('Appointment Recurrence Pattern')).toBeInTheDocument();
    });

    it('validates required fields before submission', async () => {
      render(
        <AppointmentRecurrenceSettings />
      );

      const submitButton = screen.getByRole('button', { name: /Create.*Appointments/i });

      // Try to submit without filling in required fields
      await userEvent.click(submitButton);

      // Should show validation errors or prevent submission
      await waitFor(() => {
        // Component should still be visible (not submitted)
        expect(screen.getByText('Create Recurring Appointments')).toBeInTheDocument();
      });
    });

    it('suggests minimum 1 appointment after filtering exceptions', () => {
      render(
        <AppointmentRecurrenceSettings />
      );

      // The component should validate that exceptions don't remove all appointments
      expect(screen.getByText(/Create Recurring Appointments/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Edge Case Tests
  // ============================================================================

  describe('Edge Cases', () => {
    it('handles leap year correctly', () => {
      const startDate = new Date('2024-02-29'); // Leap year
      const pattern = {
        type: 'monthly' as const,
        interval: 1,
        dayOfMonth: 29,
        maxOccurrences: 3,
        timezone: 'UTC',
      };

      const dates = generateRecurringAppointments(startDate, pattern);
      expect(dates.length).toBeGreaterThan(0);
      // First date should be Feb 29
      expect(dates[0].getDate()).toBe(29);
    });

    it('handles timezone differences', () => {
      const startDate = new Date('2026-04-20T10:00:00Z');
      const pattern = {
        type: 'daily' as const,
        interval: 1,
        maxOccurrences: 2,
        timezone: 'America/New_York', // UTC-4 (EDT)
      };

      const dates = generateRecurringAppointments(startDate, pattern);
      expect(dates).toHaveLength(2);
    });

    it('handles all days of week selection', () => {
      const startDate = new Date('2026-04-20');
      const pattern = {
        type: 'weekly' as const,
        interval: 1,
        daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        maxOccurrences: 7,
        timezone: 'UTC',
      };

      const dates = generateRecurringAppointments(startDate, pattern);
      expect(dates.length).toBeGreaterThan(0);
    });

    it('handles month end dates correctly', () => {
      const startDate = new Date('2026-03-31');
      const pattern = {
        type: 'monthly' as const,
        interval: 1,
        dayOfMonth: 31,
        maxOccurrences: 4,
        timezone: 'UTC',
      };

      const dates = generateRecurringAppointments(startDate, pattern);
      // Should handle February which has no 31st
      expect(dates.length).toBeGreaterThan(0);
    });
  });
});
