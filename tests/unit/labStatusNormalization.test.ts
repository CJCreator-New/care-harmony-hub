import { describe, it, expect } from 'vitest';

// T-70: Lab status normalisation
// Canonical values: pending | sample_collected | in_progress | completed | cancelled

const CANONICAL_LAB_STATUSES = [
  'pending',
  'sample_collected',
  'in_progress',
  'completed',
  'cancelled',
] as const;

type CanonicalLabStatus = (typeof CANONICAL_LAB_STATUSES)[number];

const LEGACY_STATUS_MAP: Record<string, CanonicalLabStatus> = {
  queued: 'pending',
  collected: 'sample_collected',
  processing: 'in_progress',
  done: 'completed',
  void: 'cancelled',
};

function normalizeLabStatus(raw: string): CanonicalLabStatus {
  if ((CANONICAL_LAB_STATUSES as readonly string[]).includes(raw)) {
    return raw as CanonicalLabStatus;
  }
  return LEGACY_STATUS_MAP[raw] ?? 'pending';
}

describe('Lab Status Normalization (T-70)', () => {
  it('passes canonical values through unchanged', () => {
    for (const status of CANONICAL_LAB_STATUSES) {
      expect(normalizeLabStatus(status)).toBe(status);
    }
  });

  it('maps legacy "queued" to "pending"', () => {
    expect(normalizeLabStatus('queued')).toBe('pending');
  });

  it('maps legacy "collected" to "sample_collected"', () => {
    expect(normalizeLabStatus('collected')).toBe('sample_collected');
  });

  it('maps legacy "processing" to "in_progress"', () => {
    expect(normalizeLabStatus('processing')).toBe('in_progress');
  });

  it('maps legacy "done" to "completed"', () => {
    expect(normalizeLabStatus('done')).toBe('completed');
  });

  it('maps legacy "void" to "cancelled"', () => {
    expect(normalizeLabStatus('void')).toBe('cancelled');
  });

  it('falls back to "pending" for unknown values', () => {
    expect(normalizeLabStatus('unknown_magic')).toBe('pending');
  });
});
