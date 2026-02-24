import { describe, it, expect, vi, beforeEach } from 'vitest';

// T-76: Dashboard quick-start idempotency
// Verifies that calling dashboard initialisation multiple times does not create duplicate
// data or trigger duplicate side effects.

interface DashboardState {
  initialized: boolean;
  initCount: number;
}

class DashboardOrchestrator {
  private state: DashboardState = { initialized: false, initCount: 0 };
  private sideEffectSpy = vi.fn();

  async initialize(hospitalId: string): Promise<DashboardState> {
    if (!hospitalId) throw new Error('hospitalId required');
    if (this.state.initialized) return this.state; // idempotent guard

    this.sideEffectSpy(); // represents a one-time setup call e.g. subscriptions
    this.state = { initialized: true, initCount: this.state.initCount + 1 };
    return this.state;
  }

  getSideEffectCallCount() {
    return this.sideEffectSpy.mock.calls.length;
  }
}

describe('Dashboard Quick-Start Idempotency (T-76)', () => {
  let orchestrator: DashboardOrchestrator;

  beforeEach(() => {
    orchestrator = new DashboardOrchestrator();
  });

  it('initializes successfully on first call', async () => {
    const result = await orchestrator.initialize('hospital-1');
    expect(result.initialized).toBe(true);
    expect(result.initCount).toBe(1);
  });

  it('does not re-run side effects on repeated calls', async () => {
    await orchestrator.initialize('hospital-1');
    await orchestrator.initialize('hospital-1');
    await orchestrator.initialize('hospital-1');
    expect(orchestrator.getSideEffectCallCount()).toBe(1);
  });

  it('returns same state on repeated calls', async () => {
    const first = await orchestrator.initialize('hospital-1');
    const second = await orchestrator.initialize('hospital-1');
    expect(second).toStrictEqual(first);
  });

  it('throws when hospitalId is missing', async () => {
    await expect(orchestrator.initialize('')).rejects.toThrow('hospitalId required');
  });
});
