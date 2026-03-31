/**
 * Break-Glass Override Tests — Phase 4
 * Tests emergency override functionality with mandatory reason capture
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateBreakGlassOverride,
  sanitizeBreakGlassReason,
  canApproveBreakGlass,
  calculateBreakGlassExpiration,
  shouldEscalateToAdmin,
  isBreakGlassExpired,
  getBreakGlassRemainingTime,
  hashBreakGlassReason,
} from '@/lib/workflow/breakglassOverride';

describe('Phase 4: Break-Glass Override System', () => {
  describe('validateBreakGlassOverride', () => {
    it('should accept valid break-glass override', () => {
      const override = validateBreakGlassOverride({
        reason: 'Patient experiencing critical hypertension - emergency treatment required immediately due to cardiac risk',
        emergency_level: 'critical',
        approved_by_role: 'emergency_physician',
        related_patient_id: 'patient-123',
        override_type: 'clinical_judgment_override',
      });

      expect(override.reason).toContain('hypertension');
      expect(override.emergency_level).toBe('critical');
    });

    it('should reject reason < 20 characters', () => {
      expect(() =>
        validateBreakGlassOverride({
          reason: 'Too short',
          emergency_level: 'critical',
          approved_by_role: 'emergency_physician',
          related_patient_id: 'patient-123',
          override_type: 'clinical_judgment_override',
        })
      ).toThrow('minimum');
    });

    it('should reject placeholder/test reasons', () => {
      expect(() =>
        validateBreakGlassOverride({
          reason: 'test123 this is just a test string for testing purposes',
          emergency_level: 'critical',
          approved_by_role: 'emergency_physician',
          related_patient_id: 'patient-123',
          override_type: 'clinical_judgment_override',
        })
      ).toThrow('placeholder');
    });

    it('should reject invalid emergency levels', () => {
      expect(() =>
        validateBreakGlassOverride({
          reason: 'Valid clinical emergency reason for override request now',
          emergency_level: 'invalid' as any,
          approved_by_role: 'emergency_physician',
          related_patient_id: 'patient-123',
          override_type: 'clinical_judgment_override',
        })
      ).toThrow();
    });
  });

  describe('sanitizeBreakGlassReason', () => {
    it('should strip email addresses', () => {
      const reason = 'Patient john.doe@hospital.com contacted about emergency';
      const sanitized = sanitizeBreakGlassReason(reason);
      expect(sanitized).not.toContain('john.doe@hospital.com');
      expect(sanitized).toContain('[EMAIL]');
    });

    it('should strip phone numbers', () => {
      const reason = 'Contact doctor at 555-123-4567 for approval';
      const sanitized = sanitizeBreakGlassReason(reason);
      expect(sanitized).not.toContain('555-123-4567');
      expect(sanitized).toContain('[PHONE]');
    });

    it('should strip MRN patterns', () => {
      const reason = 'Patient MRN 12345678 requires emergency medication';
      const sanitized = sanitizeBreakGlassReason(reason);
      expect(sanitized).not.toContain('12345678');
      expect(sanitized).toContain('[REDACTED]');
    });

    it('should preserve clinical details', () => {
      const reason = 'Patient experiencing cardiac arrhythmia with heart rate 150 - emergency intervention required';
      const sanitized = sanitizeBreakGlassReason(reason);
      expect(sanitized).toContain('cardiac arrhythmia');
      expect(sanitized).toContain('150');
    });
  });

  describe('canApproveBreakGlass', () => {
    it('should allow emergency_physician to approve all override types', () => {
      const result1 = canApproveBreakGlass('emergency_physician', 'emergency_medication_dispense');
      expect(result1.allowed).toBe(true);

      const result2 = canApproveBreakGlass('emergency_physician', 'clinical_judgment_override');
      expect(result2.allowed).toBe(true);
    });

    it('should restrict icu_nurse from discharge overrides', () => {
      const result = canApproveBreakGlass('icu_nurse', 'critical_discharge');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Not authorized');
    });

    it('should allow head_pharmacist only for medication/system overrides', () => {
      const medicineResult = canApproveBreakGlass('head_pharmacist', 'emergency_medication_dispense');
      expect(medicineResult.allowed).toBe(true);

      const dischargeResult = canApproveBreakGlass('head_pharmacist', 'critical_discharge');
      expect(dischargeResult.allowed).toBe(false);
    });

    it('should allow admin all override types', () => {
      const types = [
        'emergency_medication_dispense',
        'critical_discharge',
        'lab_override_critical_value',
        'system_unavailable_workaround',
        'clinical_judgment_override',
      ];

      types.forEach(type => {
        const result = canApproveBreakGlass('admin', type);
        expect(result.allowed).toBe(true);
      });
    });
  });

  describe('Break-Glass Timing', () => {
    it('should calculate 1-hour expiration', () => {
      const now = new Date('2026-03-31T12:00:00Z').getTime();
      const expiration = calculateBreakGlassExpiration(now);
      const expiresAt = new Date(expiration).getTime();
      
      expect(expiresAt - now).toBe(60 * 60 * 1000); // Exactly 1 hour
    });

    it('should detect expired overrides', () => {
      const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      expect(isBreakGlassExpired(pastTime)).toBe(true);

      const futureTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min from now
      expect(isBreakGlassExpired(futureTime)).toBe(false);
    });

    it('should calculate remaining time correctly', () => {
      const now = Date.now();
      const thirtyMinutesAhead = new Date(now + 30 * 60 * 1000).toISOString();
      const remaining = getBreakGlassRemainingTime(thirtyMinutesAhead);
      
      // Allow 1 second tolerance
      expect(Math.abs(remaining - (30 * 60 * 1000))).toBeLessThan(1000);
    });

    it('should return 0 for expired overrides', () => {
      const pastTime = new Date(Date.now() - 1000).toISOString();
      const remaining = getBreakGlassRemainingTime(pastTime);
      expect(remaining).toBe(0);
    });
  });

  describe('Escalation Logic', () => {
    it('should escalate override active > 1 minute', () => {
      const oneMinuteAgo = new Date(Date.now() - 61 * 1000).toISOString();
      expect(shouldEscalateToAdmin(oneMinuteAgo)).toBe(true);
    });

    it('should not escalate override < 1 minute', () => {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
      expect(shouldEscalateToAdmin(thirtySecondsAgo)).toBe(false);
    });

    it('should consider completion time in escalation calc', () => {
      const created = new Date('2026-03-31T12:00:00Z').toISOString();
      const completed = new Date('2026-03-31T12:00:30Z').toISOString();
      
      // 30 seconds difference - no escalation
      expect(shouldEscalateToAdmin(created, completed)).toBe(false);

      const completedLate = new Date('2026-03-31T12:02:00Z').toISOString();
      // 2 minutes difference - escalate
      expect(shouldEscalateToAdmin(created, completedLate)).toBe(true);
    });
  });

  describe('Reason Hashing', () => {
    it('should generate consistent hash for same reason', async () => {
      const reason = 'Patient experiencing critical cardiac event - immediate intervention needed';
      const hash1 = await hashBreakGlassReason(reason);
      const hash2 = await hashBreakGlassReason(reason);
      
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBeGreaterThan(0); // Should produce non-empty hash
    });

    it('should generate different hash for different reasons', async () => {
      const reason1 = 'Patient experiencing critical cardiac event - immediate intervention needed';
      const reason2 = 'Patient experiencing critical respiratory event - immediate intervention needed';
      
      const hash1 = await hashBreakGlassReason(reason1);
      const hash2 = await hashBreakGlassReason(reason2);
      
      expect(hash1).not.toBe(hash2);
    });
  });
});
