import { describe, it, expect } from 'vitest';

// T-72: Queue wait-time utility
// Validates that queue wait-time calculations are correct based on check-in timestamp

function calculateWaitMinutes(checkInISO: string, nowISO?: string): number {
  const checkIn = new Date(checkInISO).getTime();
  const now = nowISO ? new Date(nowISO).getTime() : Date.now();
  return Math.max(0, Math.floor((now - checkIn) / 60_000));
}

function formatWaitTime(minutes: number): string {
  if (minutes < 1) return 'Just arrived';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function getWaitStatus(minutes: number): 'normal' | 'warning' | 'critical' {
  if (minutes >= 60) return 'critical';
  if (minutes >= 30) return 'warning';
  return 'normal';
}

describe('Queue Wait-Time Utility (T-72)', () => {
  const now = '2024-06-01T10:00:00.000Z';

  it('returns 0 for a future check-in time (clock skew protection)', () => {
    const future = '2024-06-01T10:05:00.000Z';
    expect(calculateWaitMinutes(future, now)).toBe(0);
  });

  it('calculates 15 minutes correctly', () => {
    const checkIn = '2024-06-01T09:45:00.000Z';
    expect(calculateWaitMinutes(checkIn, now)).toBe(15);
  });

  it('calculates 75 minutes correctly', () => {
    const checkIn = '2024-06-01T08:45:00.000Z';
    expect(calculateWaitMinutes(checkIn, now)).toBe(75);
  });

  it('formats sub-minute as "Just arrived"', () => {
    expect(formatWaitTime(0)).toBe('Just arrived');
  });

  it('formats 45 minutes as "45m"', () => {
    expect(formatWaitTime(45)).toBe('45m');
  });

  it('formats 60 minutes as "1h"', () => {
    expect(formatWaitTime(60)).toBe('1h');
  });

  it('formats 90 minutes as "1h 30m"', () => {
    expect(formatWaitTime(90)).toBe('1h 30m');
  });

  it('returns "normal" status for waits under 30 min', () => {
    expect(getWaitStatus(20)).toBe('normal');
  });

  it('returns "warning" status for waits between 30–59 min', () => {
    expect(getWaitStatus(45)).toBe('warning');
  });

  it('returns "critical" status for waits >= 60 min', () => {
    expect(getWaitStatus(60)).toBe('critical');
    expect(getWaitStatus(90)).toBe('critical');
  });
});
