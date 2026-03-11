/**
 * Flaky Test Registry
 * ─────────────────────────────────────────────────────────────────────────
 * Tests listed here are QUARANTINED — they are known to fail non-deterministically
 * and must NOT silently pollute CI results.
 *
 * Strategy (from test-automation-strategy skill):
 *   1. Add entry below with ticket, root-cause hypothesis, and expiry date.
 *   2. Annotate the actual test with describe.skip / test.skip referencing the entry.
 *   3. Fix within the SLA (default 14 days) or escalate to deletion.
 *   4. Remove entry and test annotation once stabilised and verified green × 10 runs.
 *
 * Never ignore flaky tests — quarantine, fix, or delete.
 */

export interface FlakyTestEntry {
  /** Unique ID — monotonically increasing. */
  id: string;
  /** Test file relative to workspace root. */
  file: string;
  /** Exact `it` / `test` description string. */
  testName: string;
  /** Jira / GitHub issue tracking the fix. */
  ticket: string;
  /** When the flakiness was first observed (ISO date). */
  quarantinedOn: string;
  /** Deadline to fix or escalate (ISO date, typically +14 days). */
  fixBy: string;
  /** Root-cause hypothesis. */
  hypothesis: 'timing' | 'data-isolation' | 'race-condition' | 'environment' | 'unknown';
  /** Short description of what goes wrong. */
  description: string;
  /** Suggested stabilisation approach. */
  remediation: string;
}

export const FLAKY_REGISTRY: FlakyTestEntry[] = [
  // ── Example entries (remove once resolved) ────────────────────────────────
  // {
  //   id: 'FLK-001',
  //   file: 'tests/e2e/real-time-sync.test.ts',
  //   testName: 'should sync lab results in real time',
  //   ticket: 'INC-1234',
  //   quarantinedOn: '2026-03-01',
  //   fixBy: '2026-03-15',
  //   hypothesis: 'timing',
  //   description: 'WebSocket subscription occasionally receives event after assertion window.',
  //   remediation: 'Add explicit waitForResponse() or extend assertion timeout to 15s.',
  // },
];

/**
 * Returns all entries whose fixBy date has passed.
 * Useful in a CI health-check script to surface overdue entries.
 */
export function getOverdueEntries(asOf = new Date()): FlakyTestEntry[] {
  return FLAKY_REGISTRY.filter((e) => new Date(e.fixBy) < asOf);
}

/**
 * Returns all entries grouped by root-cause hypothesis.
 */
export function groupByHypothesis(): Record<FlakyTestEntry['hypothesis'], FlakyTestEntry[]> {
  return FLAKY_REGISTRY.reduce(
    (acc, entry) => {
      acc[entry.hypothesis] = [...(acc[entry.hypothesis] ?? []), entry];
      return acc;
    },
    {} as Record<FlakyTestEntry['hypothesis'], FlakyTestEntry[]>
  );
}
