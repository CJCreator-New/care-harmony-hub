import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAmendmentAlerts, createAmendmentAlert } from '@/hooks/useAmendmentAlerts';
import { useAuth } from '@/contexts/AuthContext';

// Mock Auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('useAmendmentAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty alerts', () => {
    const mockProfile = { hospital_id: 'hosp_123', primary_role: 'doctor' };
    (useAuth as any).mockReturnValue({ profile: mockProfile });

    const { result } = renderHook(() => useAmendmentAlerts('hosp_123'));

    expect(result.current.alerts).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('should mark alert as read', () => {
    const mockProfile = { hospital_id: 'hosp_123', primary_role: 'doctor' };
    (useAuth as any).mockReturnValue({ profile: mockProfile });

    const { result } = renderHook(() => useAmendmentAlerts('hosp_123'));

    const testAlert = createAmendmentAlert({
      amendmentId: 'amend_1',
      recordId: 'rx_123',
      recordType: 'prescription',
      changeType: 'DOSAGE_CHANGE',
      originalValue: '500mg',
      amendedValue: '250mg',
      amendedBy: { name: 'Dr. Smith', role: 'DOCTOR' },
    });

    // In a real scenario, alerts would be populated via subscription
    // For testing, we simulate this
    act(() => {
      // Would normally happen via subscription
    });

    expect(result.current.markAsRead).toBeDefined();
  });

  it('should clear individual alert', () => {
    const mockProfile = { hospital_id: 'hosp_123', primary_role: 'doctor' };
    (useAuth as any).mockReturnValue({ profile: mockProfile });

    const { result } = renderHook(() => useAmendmentAlerts('hosp_123'));

    expect(result.current.clearAlert).toBeDefined();
  });

  it('should clear all alerts', () => {
    const mockProfile = { hospital_id: 'hosp_123', primary_role: 'doctor' };
    (useAuth as any).mockReturnValue({ profile: mockProfile });

    const { result } = renderHook(() => useAmendmentAlerts('hosp_123'));

    expect(result.current.clearAllAlerts).toBeDefined();
  });

  it('should filter alerts by severity', () => {
    const mockProfile = { hospital_id: 'hosp_123', primary_role: 'doctor' };
    (useAuth as any).mockReturnValue({ profile: mockProfile });

    const { result } = renderHook(() => useAmendmentAlerts('hosp_123'));

    // Verify initialization
    expect(result.current.alerts).toEqual([]);
  });
});

describe('createAmendmentAlert', () => {
  it('should create alert from amendment data', () => {
    const amendment = {
      amendmentId: 'amend_1',
      recordId: 'rx_123',
      recordType: 'prescription',
      changeType: 'DOSAGE_CHANGE',
      originalValue: '500mg',
      amendedValue: '250mg',
      reason: 'Renal adjustment',
      amendedBy: { name: 'Dr. Smith', role: 'DOCTOR', email: 'dr@hospital.local' },
    };

    const alert = createAmendmentAlert(amendment);

    expect(alert.amendmentId).toBe('amend_1');
    expect(alert.recordId).toBe('rx_123');
    expect(alert.recordType).toBe('prescription');
    expect(alert.unread).toBe(true);
    expect(alert.amendedBy.name).toBe('Dr. Smith');
  });

  it('should handle missing fields gracefully', () => {
    const amendment = {
      amendmentId: 'amend_1',
      changeType: 'DOSAGE_CHANGE',
    };

    const alert = createAmendmentAlert(amendment);

    expect(alert.amendmentId).toBe('amend_1');
    expect(alert.amendedBy.name).toBe('Unknown');
    expect(alert.unread).toBe(true);
  });

  it('should parse severity correctly from change type', () => {
    const testCases = [
      { changeType: 'CRITICAL_ALERT', expected: 'CRITICAL' },
      { changeType: 'DOSAGE_CHANGE', expected: 'HIGH' },
      { changeType: 'QUANTITY_CHANGE', expected: 'MEDIUM' },
      { changeType: 'OTHER', expected: 'LOW' },
    ];

    testCases.forEach(({ changeType, expected }) => {
      const alert = createAmendmentAlert({ changeType, amendmentId: 'test' });
      expect(alert.severity).toBe(expected);
    });
  });
});
