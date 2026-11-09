import { describe, it, expect } from 'vitest';
import {
  CHECK_IN_BACK_TARGET,
  CHECK_IN_TRANSITIONS,
  CHECK_IN_PROGRESS_STEPS,
  INITIAL_CHECK_IN_STEP,
  backTarget,
  canTransition,
  transition,
  type CheckInStep,
} from './checkInFlow';

const ALL_STEPS: CheckInStep[] = ['search', 'verify', 'insurance', 'copay', 'complete'];

describe('check-in flow state machine', () => {
  it('starts on search', () => {
    expect(INITIAL_CHECK_IN_STEP).toBe('search');
  });

  it('allows the wizard path search -> verify -> insurance -> copay -> complete', () => {
    expect(transition('search', 'verify')).toBe('verify');
    expect(transition('verify', 'insurance')).toBe('insurance');
    expect(transition('insurance', 'copay')).toBe('copay');
    expect(transition('copay', 'complete')).toBe('complete');
  });

  it('allows express check-in directly from search to complete', () => {
    expect(canTransition('search', 'complete')).toBe(true);
  });

  it('rejects skipping steps and moves out of complete', () => {
    expect(transition('search', 'insurance')).toBe('search');
    expect(transition('search', 'copay')).toBe('search');
    expect(transition('verify', 'copay')).toBe('verify');
    expect(transition('verify', 'complete')).toBe('verify');
    expect(transition('complete', 'search')).toBe('complete');
    expect(transition('complete', 'copay')).toBe('complete');
  });

  it('keeps the current step when a move is illegal', () => {
    for (const from of ALL_STEPS) {
      for (const to of ALL_STEPS) {
        const expected = canTransition(from, to) ? to : from;
        expect(transition(from, to)).toBe(expected);
      }
    }
  });

  it('defines a transition entry for every step', () => {
    for (const step of ALL_STEPS) {
      expect(CHECK_IN_TRANSITIONS[step]).toBeDefined();
    }
  });

  it('has no move that targets a step outside the flow', () => {
    for (const step of ALL_STEPS) {
      for (const target of CHECK_IN_TRANSITIONS[step]) {
        expect(ALL_STEPS).toContain(target);
      }
    }
  });

  it('only offers Back on the steps that have a previous step', () => {
    expect(backTarget('verify')).toBe('search');
    expect(backTarget('insurance')).toBe('verify');
    expect(backTarget('copay')).toBe('insurance');
    expect(backTarget('search')).toBeNull();
    expect(backTarget('complete')).toBeNull();
  });

  it('only ever goes Back along a legal transition', () => {
    for (const [from, back] of Object.entries(CHECK_IN_BACK_TARGET)) {
      expect(canTransition(from as CheckInStep, back as CheckInStep)).toBe(true);
    }
  });

  it('shows the progress bar for the four wizard steps in order', () => {
    expect(CHECK_IN_PROGRESS_STEPS).toEqual(['search', 'verify', 'insurance', 'copay']);
  });
});
