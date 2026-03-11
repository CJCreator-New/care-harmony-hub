/**
 * T-P03: Lab Priority Mapping Unit Tests
 * Tests mapToCanonicalLabPriority and mapToWorkflowPriority from @/utils/labPriority.
 * These functions normalise diverse incoming priority strings to a stable canonical set.
 *
 * Pyramid layer: UNIT (70%)
 * F.I.R.S.T.: Fast (<1ms), Isolated, Repeatable, Self-validating, Timely
 */
import { describe, it, expect } from 'vitest';
import { mapToCanonicalLabPriority, mapToWorkflowPriority } from '@/utils/labPriority';

describe('mapToCanonicalLabPriority', () => {
  // --- canonical pass-throughs ---
  it('maps "routine" → "routine"', () => {
    expect(mapToCanonicalLabPriority('routine')).toBe('routine');
  });

  it('maps "urgent" → "urgent"', () => {
    expect(mapToCanonicalLabPriority('urgent')).toBe('urgent');
  });

  it('maps "stat" → "stat"', () => {
    expect(mapToCanonicalLabPriority('stat')).toBe('stat');
  });

  // --- synonym mappings ---
  it('maps "high" → "urgent"', () => {
    expect(mapToCanonicalLabPriority('high')).toBe('urgent');
  });

  it('maps "emergency" → "urgent"', () => {
    expect(mapToCanonicalLabPriority('emergency')).toBe('urgent');
  });

  it('maps "critical" → "stat"', () => {
    expect(mapToCanonicalLabPriority('critical')).toBe('stat');
  });

  // --- case insensitivity ---
  it('handles uppercase "URGENT" → "urgent"', () => {
    expect(mapToCanonicalLabPriority('URGENT')).toBe('urgent');
  });

  it('handles mixed case "Stat" → "stat"', () => {
    expect(mapToCanonicalLabPriority('Stat')).toBe('stat');
  });

  // --- null / undefined / unknown ---
  it('defaults null to "routine"', () => {
    expect(mapToCanonicalLabPriority(null)).toBe('routine');
  });

  it('defaults undefined to "routine"', () => {
    expect(mapToCanonicalLabPriority(undefined)).toBe('routine');
  });

  it('defaults unknown string to "routine"', () => {
    expect(mapToCanonicalLabPriority('low')).toBe('routine');
    expect(mapToCanonicalLabPriority('normal')).toBe('routine');
    expect(mapToCanonicalLabPriority('')).toBe('routine');
  });
});

describe('mapToWorkflowPriority', () => {
  it('routine maps to "normal"', () => {
    expect(mapToWorkflowPriority('routine')).toBe('normal');
  });

  it('urgent maps to "urgent"', () => {
    expect(mapToWorkflowPriority('urgent')).toBe('urgent');
  });

  it('stat maps to "urgent"', () => {
    expect(mapToWorkflowPriority('stat')).toBe('urgent');
  });

  it('high (synonym for urgent) maps to "urgent"', () => {
    expect(mapToWorkflowPriority('high')).toBe('urgent');
  });

  it('null maps to "normal"', () => {
    expect(mapToWorkflowPriority(null)).toBe('normal');
  });

  it('unknown string maps to "normal"', () => {
    expect(mapToWorkflowPriority('low')).toBe('normal');
  });
});
