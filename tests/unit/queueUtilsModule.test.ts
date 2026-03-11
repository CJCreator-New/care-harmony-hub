/**
 * T-P04: QueueUtils Module Unit Tests
 * Tests getQueueStartTime, getWaitMinutes, formatWaitTime from @/utils/queueUtils.
 * These tests import from the real production module (not a reimplementation).
 *
 * Pyramid layer: UNIT (70%)
 * F.I.R.S.T.: Fast (<1ms), Isolated, Repeatable, Self-validating, Timely
 */
import { describe, it, expect } from 'vitest';
import { getQueueStartTime, getWaitMinutes, formatWaitTime } from '@/utils/queueUtils';

const NOW = '2024-06-01T10:00:00.000Z';

describe('getQueueStartTime', () => {
  it('returns check_in_time when provided', () => {
    const entry = { check_in_time: '2024-06-01T09:30:00.000Z', created_at: '2024-06-01T09:00:00.000Z' };
    expect(getQueueStartTime(entry)).toBe('2024-06-01T09:30:00.000Z');
  });

  it('falls back to created_at when check_in_time is null', () => {
    const entry = { check_in_time: null, created_at: '2024-06-01T09:00:00.000Z' };
    expect(getQueueStartTime(entry)).toBe('2024-06-01T09:00:00.000Z');
  });

  it('falls back to created_at when check_in_time is undefined', () => {
    const entry = { created_at: '2024-06-01T09:00:00.000Z' };
    expect(getQueueStartTime(entry)).toBe('2024-06-01T09:00:00.000Z');
  });
});

describe('getWaitMinutes', () => {
  it('calculates 30 minutes wait correctly', () => {
    const entry = { check_in_time: '2024-06-01T09:30:00.000Z', created_at: '2024-06-01T09:00:00.000Z' };
    expect(getWaitMinutes(entry, NOW)).toBe(30);
  });

  it('calculates 60 minutes wait correctly', () => {
    const entry = { check_in_time: '2024-06-01T09:00:00.000Z', created_at: '2024-06-01T08:00:00.000Z' };
    expect(getWaitMinutes(entry, NOW)).toBe(60);
  });

  it('calculates 90 minutes using fallback created_at', () => {
    const entry = { check_in_time: null, created_at: '2024-06-01T08:30:00.000Z' };
    expect(getWaitMinutes(entry, NOW)).toBe(90);
  });

  it('clamps negative wait (future check-in) to 0', () => {
    const entry = { check_in_time: '2024-06-01T10:05:00.000Z', created_at: '2024-06-01T10:05:00.000Z' };
    expect(getWaitMinutes(entry, NOW)).toBe(0);
  });

  it('returns 0 for same-second check-in', () => {
    const entry = { check_in_time: NOW, created_at: NOW };
    expect(getWaitMinutes(entry, NOW)).toBe(0);
  });

  it('truncates partial minutes (floors)', () => {
    // 45.9 minutes — should return 45
    const entry = { check_in_time: '2024-06-01T09:14:06.000Z', created_at: '2024-06-01T09:14:06.000Z' };
    expect(getWaitMinutes(entry, NOW)).toBe(45);
  });
});

describe('formatWaitTime', () => {
  it('formats 0 minutes as "Just arrived"', () => {
    expect(formatWaitTime(0)).toBe('Just arrived');
  });

  it('formats sub-minute (< 1) as "Just arrived"', () => {
    // getWaitMinutes floors, so this case covers 0
    expect(formatWaitTime(0)).toBe('Just arrived');
  });

  it('formats 1 minute as "1m"', () => {
    expect(formatWaitTime(1)).toBe('1m');
  });

  it('formats 45 minutes as "45m"', () => {
    expect(formatWaitTime(45)).toBe('45m');
  });

  it('formats 59 minutes as "59m"', () => {
    expect(formatWaitTime(59)).toBe('59m');
  });

  it('formats 60 minutes as "1h"', () => {
    expect(formatWaitTime(60)).toBe('1h');
  });

  it('formats 90 minutes as "1h 30m"', () => {
    expect(formatWaitTime(90)).toBe('1h 30m');
  });

  it('formats 120 minutes as "2h"', () => {
    expect(formatWaitTime(120)).toBe('2h');
  });

  it('formats 185 minutes as "3h 5m"', () => {
    expect(formatWaitTime(185)).toBe('3h 5m');
  });
});
