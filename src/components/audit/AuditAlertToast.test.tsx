import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuditAlertToastSystem } from '@/components/audit/AuditAlertToast';
import { useAmendmentAlerts } from '@/hooks/useAmendmentAlerts';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/hooks/useAmendmentAlerts');
vi.mock('@/contexts/AuthContext');
vi.mock('sonner');

describe('AuditAlertToastSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render any UI elements', () => {
    (useAmendmentAlerts as any).mockReturnValue({
      alerts: [],
      unreadCount: 0,
      markAsRead: vi.fn(),
    });

    (useAuth as any).mockReturnValue({
      profile: { hospital_id: 'hosp_123', primary_role: 'doctor' },
    });

    const { container } = render(
      <AuditAlertToastSystem hospitalId="hosp_123" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should be disabled when disabled prop is true', () => {
    (useAmendmentAlerts as any).mockReturnValue({
      alerts: [],
      unreadCount: 0,
      markAsRead: vi.fn(),
    });

    (useAuth as any).mockReturnValue({
      profile: { hospital_id: 'hosp_123', primary_role: 'doctor' },
    });

    const { container } = render(
      <AuditAlertToastSystem hospitalId="hosp_123" disabled={true} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should filter alerts by role when filterByRole is provided', () => {
    (useAmendmentAlerts as any).mockReturnValue({
      alerts: [],
      unreadCount: 0,
      markAsRead: vi.fn(),
    });

    (useAuth as any).mockReturnValue({
      profile: { hospital_id: 'hosp_123', primary_role: 'pharmacist' },
    });

    render(
      <AuditAlertToastSystem
        hospitalId="hosp_123"
        filterByRole="pharmacist"
      />
    );

    expect(useAmendmentAlerts).toHaveBeenCalledWith('hosp_123', 'pharmacist');
  });

  it('should call onAlertShown callback when alert is shown', () => {
    const onAlertShown = vi.fn();
    const mockAlert = {
      amendmentId: 'amend_1',
      recordId: 'rx_123',
      recordType: 'prescription' as const,
      severity: 'HIGH' as const,
      message: 'Dosage changed',
      timestamp: new Date().toISOString(),
      unread: true,
      amendedBy: { name: 'Dr. Smith', role: 'DOCTOR' },
    };

    (useAmendmentAlerts as any).mockReturnValue({
      alerts: [mockAlert],
      unreadCount: 1,
      markAsRead: vi.fn(),
    });

    (useAuth as any).mockReturnValue({
      profile: { hospital_id: 'hosp_123', primary_role: 'doctor' },
    });

    render(
      <AuditAlertToastSystem
        hospitalId="hosp_123"
        onAlertShown={onAlertShown}
      />
    );

    waitFor(() => {
      expect(onAlertShown).toHaveBeenCalledWith(expect.objectContaining({
        amendmentId: 'amend_1',
      }));
    });
  });

  it('should use custom toast formatter when provided', () => {
    const formatToastMessage = vi.fn(() => 'Custom message');
    const mockAlert = {
      amendmentId: 'amend_1',
      recordId: 'rx_123',
      recordType: 'prescription' as const,
      severity: 'CRITICAL' as const,
      message: 'Dosage changed',
      timestamp: new Date().toISOString(),
      unread: true,
      amendedBy: { name: 'Dr. Smith', role: 'DOCTOR' },
    };

    (useAmendmentAlerts as any).mockReturnValue({
      alerts: [mockAlert],
      unreadCount: 1,
      markAsRead: vi.fn(),
    });

    (useAuth as any).mockReturnValue({
      profile: { hospital_id: 'hosp_123', primary_role: 'doctor' },
    });

    render(
      <AuditAlertToastSystem
        hospitalId="hosp_123"
        formatToastMessage={formatToastMessage}
      />
    );

    waitFor(() => {
      expect(formatToastMessage).toHaveBeenCalled();
    });
  });
});

describe('Severity-based Toast Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show critical alerts as errors with no auto-close', () => {
    const mockAlert = {
      amendmentId: 'amend_1',
      recordId: 'rx_123',
      recordType: 'prescription' as const,
      severity: 'CRITICAL' as const,
      message: 'Critical dosage change',
      timestamp: new Date().toISOString(),
      unread: true,
      amendedBy: { name: 'Dr. Smith', role: 'DOCTOR' },
    };

    (useAmendmentAlerts as any).mockReturnValue({
      alerts: [mockAlert],
      unreadCount: 1,
      markAsRead: vi.fn(),
    });

    (useAuth as any).mockReturnValue({
      profile: { hospital_id: 'hosp_123', primary_role: 'doctor' },
    });

    render(<AuditAlertToastSystem hospitalId="hosp_123" />);

    waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 0 })
      );
    });
  });

  it('should show high severity alerts with 8s auto-close', () => {
    const mockAlert = {
      amendmentId: 'amend_1',
      recordId: 'rx_123',
      recordType: 'prescription' as const,
      severity: 'HIGH' as const,
      message: 'High severity change',
      timestamp: new Date().toISOString(),
      unread: true,
      amendedBy: { name: 'Dr. Smith', role: 'DOCTOR' },
    };

    (useAmendmentAlerts as any).mockReturnValue({
      alerts: [mockAlert],
      unreadCount: 1,
      markAsRead: vi.fn(),
    });

    (useAuth as any).mockReturnValue({
      profile: { hospital_id: 'hosp_123', primary_role: 'doctor' },
    });

    render(<AuditAlertToastSystem hospitalId="hosp_123" />);

    waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 8000 })
      );
    });
  });

  it('should show low severity alerts with 4s auto-close', () => {
    const mockAlert = {
      amendmentId: 'amend_1',
      recordId: 'rx_123',
      recordType: 'prescription' as const,
      severity: 'LOW' as const,
      message: 'Low severity change',
      timestamp: new Date().toISOString(),
      unread: true,
      amendedBy: { name: 'Dr. Smith', role: 'DOCTOR' },
    };

    (useAmendmentAlerts as any).mockReturnValue({
      alerts: [mockAlert],
      unreadCount: 1,
      markAsRead: vi.fn(),
    });

    (useAuth as any).mockReturnValue({
      profile: { hospital_id: 'hosp_123', primary_role: 'doctor' },
    });

    render(<AuditAlertToastSystem hospitalId="hosp_123" />);

    waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 4000 })
      );
    });
  });
});
