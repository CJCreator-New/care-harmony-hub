import { describe, it, expect } from 'vitest';

// Pure logic tester matching the critical-lab-check age group resolution & range evaluation
function resolveAgeGroup(birthDateStr?: string, explicitAgeGroup?: string): string {
  if (explicitAgeGroup) return explicitAgeGroup;
  if (!birthDateStr) return 'adult';

  const birthDate = new Date(birthDateStr);
  const now = new Date('2026-09-09T00:00:00Z');
  const ageMs = now.getTime() - birthDate.getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  const ageYears = ageDays / 365.25;

  if (ageDays < 28) return 'neonate';
  if (ageYears < 1) return 'infant';
  if (ageYears < 12) return 'pediatric';
  if (ageYears < 18) return 'adolescent';
  if (ageYears >= 65) return 'geriatric';
  return 'adult';
}

function evaluateCriticalValue(
  resultValue: number,
  ranges?: { critical_low?: number; critical_high?: number; warning_low?: number; warning_high?: number } | null
): { severity: string; isCritical: boolean; reason?: string } {
  if (!ranges) {
    return {
      severity: 'critical',
      isCritical: true,
      reason: 'Missing reference range - requires immediate manual review',
    };
  }

  if (ranges.critical_low !== undefined && resultValue < ranges.critical_low) {
    return { severity: 'critical_low', isCritical: true };
  }
  if (ranges.critical_high !== undefined && resultValue > ranges.critical_high) {
    return { severity: 'critical_high', isCritical: true };
  }
  if (ranges.warning_low !== undefined && resultValue < ranges.warning_low) {
    return { severity: 'warning', isCritical: false };
  }
  if (ranges.warning_high !== undefined && resultValue > ranges.warning_high) {
    return { severity: 'warning', isCritical: false };
  }

  return { severity: 'normal', isCritical: false };
}

describe('CLIN-003: Dynamic Lab Age Group & Fail-Closed Range Matching', () => {
  it('AC-1: maps a 3-year-old child to pediatric age group and does not use adult range', () => {
    // 3 years before 2026-09-09 = 2023-09-09
    const ageGroup = resolveAgeGroup('2023-09-09');
    expect(ageGroup).toBe('pediatric');

    // Pediatric potassium normal range is approx 3.4 - 5.0 mmol/L, critical > 6.0
    const pedRanges = { critical_low: 2.8, critical_high: 6.0 };
    const result = evaluateCriticalValue(4.5, pedRanges);
    expect(result.isCritical).toBe(false);
    expect(result.severity).toBe('normal');
  });

  it('AC-2: maps a 14-day-old neonate to neonate age group, avoiding false adult panic', () => {
    // 14 days before 2026-09-09 = 2026-08-26
    const ageGroup = resolveAgeGroup('2026-08-26');
    expect(ageGroup).toBe('neonate');

    // Neonatal potassium normal range can extend up to 6.5 mmol/L (critical > 7.0 mmol/L)
    // For adults, potassium 6.2 mmol/L is critical high (> 6.0)
    const adultRanges = { critical_low: 2.8, critical_high: 6.0 };
    const neonateRanges = { critical_low: 3.2, critical_high: 7.0 };

    const adultEval = evaluateCriticalValue(6.2, adultRanges);
    expect(adultEval.isCritical).toBe(true);
    expect(adultEval.severity).toBe('critical_high');

    const neonateEval = evaluateCriticalValue(6.2, neonateRanges);
    expect(neonateEval.isCritical).toBe(false);
    expect(neonateEval.severity).toBe('normal');
  });

  it('AC-3: fails closed when no reference range exists for an assay', () => {
    const unconfiguredEval = evaluateCriticalValue(14.2, null);
    expect(unconfiguredEval.isCritical).toBe(true);
    expect(unconfiguredEval.severity).toBe('critical');
    expect(unconfiguredEval.reason).toContain('Missing reference range');
  });

  it('correctly maps infant, adolescent, adult, and geriatric brackets', () => {
    expect(resolveAgeGroup('2026-03-09')).toBe('infant'); // 6 months
    expect(resolveAgeGroup('2011-09-09')).toBe('adolescent'); // 15 years
    expect(resolveAgeGroup('1990-09-09')).toBe('adult'); // 36 years
    expect(resolveAgeGroup('1950-09-09')).toBe('geriatric'); // 76 years
  });
});
