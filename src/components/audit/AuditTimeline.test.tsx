import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditTimeline } from '@/components/audit/AuditTimeline';
import { useAuditTrail } from '@/hooks/useAuditTrail';

vi.mock('@/hooks/useAuditTrail', () => ({
  useAuditTrail: vi.fn(),
}));

describe('AuditTimeline Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    (useAuditTrail as any).mockReturnValue({
      auditTrail: [],
      isLoading: true,
      error: null,
      hasAmendments: false,
    });

    render(<AuditTimeline recordId="rx_123" recordType="prescription" />);
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders empty state when no amendments', () => {
    (useAuditTrail as any).mockReturnValue({
      auditTrail: [],
      isLoading: false,
      error: null,
      hasAmendments: false,
    });

    render(<AuditTimeline recordId="rx_123" recordType="prescription" hideIfEmpty={false} />);
    expect(screen.getByText(/no amendments yet/i)).toBeInTheDocument();
  });

  it('renders amendment metadata when amendments are present', () => {
    (useAuditTrail as any).mockReturnValue({
      auditTrail: [
        {
          amendmentId: 'amend_1',
          timestamp: '2026-03-13T10:00:00Z',
          amendedBy: { userId: 'user_1', name: 'Dr. Smith', email: 'dr@hospital', role: 'DOCTOR' },
          changeType: 'DOSAGE_CHANGE',
          originalValue: '500mg',
          amendedValue: '250mg',
          reason: 'Renal adjustment',
          severity: 'HIGH',
          sequence: 1,
        },
      ],
      isLoading: false,
      error: null,
      hasAmendments: true,
    });

    render(<AuditTimeline recordId="rx_123" recordType="prescription" />);
    expect(screen.getByText(/dr. smith/i)).toBeInTheDocument();
    expect(screen.getByText(/dosage_change/i)).toBeInTheDocument();
  });
});
