import { describe, expect, it } from 'vitest';
import {
  administrationBlock,
  doseIntervalHours,
  isSameLocalDay,
} from '@/pages/nurse/medicationDoseGuard';

const HOUR = 60 * 60 * 1000;
const now = new Date('2026-11-05T12:00:00Z');
const given = (hoursAgo: number, extra: Record<string, unknown> = {}) => ({
  prescription_id: 'rx-1',
  medication_name: 'Insulin Lispro',
  status: 'administered',
  administered_at: new Date(now.getTime() - hoursAgo * HOUR).toISOString(),
  ...extra,
});

describe('dose interval from the prescribed frequency (CLIN-13)', () => {
  it.each([
    ['q4h', 4],
    ['q6h', 6],
    ['q8h', 8],
    ['BID', 12],
    ['TID', 8],
    ['daily', 24],
  ])('%s is every %s hours', (frequency, hours) => {
    expect(doseIntervalHours(frequency)).toBe(hours);
  });

  it('an unreadable frequency uses the longest interval so it cannot prompt an early second dose', () => {
    expect(doseIntervalHours('every morning if needed')).toBe(24);
    expect(doseIntervalHours(undefined)).toBe(24);
  });
});

describe('administrationBlock (CLIN-13 double-dose guard)', () => {
  const base = { prescriptionId: 'rx-1', medicationName: 'Insulin Lispro', frequency: 'q4h', now };

  it('blocks a second administration of the same dose inside the interval', () => {
    const block = administrationBlock({ ...base, administrations: [given(1)] });
    expect(block.blocked).toBe(true);
    expect(block.nextDueAt?.getTime()).toBe(now.getTime() + 3 * HOUR);
  });

  it('allows the next dose once the interval has passed', () => {
    expect(administrationBlock({ ...base, administrations: [given(4.5)] }).blocked).toBe(false);
  });

  it('uses the most recent given dose', () => {
    const block = administrationBlock({ ...base, administrations: [given(9), given(2)] });
    expect(block.blocked).toBe(true);
    expect(block.lastGivenAt?.getTime()).toBe(now.getTime() - 2 * HOUR);
  });

  it('accepts the DB vocabulary "given"', () => {
    expect(administrationBlock({ ...base, administrations: [given(1, { status: 'given' })] }).blocked).toBe(true);
  });

  it('ignores refused, held and withheld doses', () => {
    for (const status of ['refused', 'held', 'withheld', 'not_given']) {
      expect(administrationBlock({ ...base, administrations: [given(1, { status })] }).blocked).toBe(false);
    }
  });

  it('ignores doses of another prescription or another drug', () => {
    expect(
      administrationBlock({ ...base, administrations: [given(1, { prescription_id: 'rx-2' })] }).blocked
    ).toBe(false);
    expect(
      administrationBlock({ ...base, administrations: [given(1, { medication_name: 'Metformin' })] }).blocked
    ).toBe(false);
  });
});

describe('isSameLocalDay (CLIN-13 "today" counters)', () => {
  it('treats two times on one local calendar day as the same day', () => {
    expect(isSameLocalDay(new Date(2026, 10, 5, 0, 10), new Date(2026, 10, 5, 23, 50))).toBe(true);
  });

  it('separates local midnight', () => {
    expect(isSameLocalDay(new Date(2026, 10, 5, 23, 59), new Date(2026, 10, 6, 0, 1))).toBe(false);
  });
});
