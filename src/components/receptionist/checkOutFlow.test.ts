import { describe, it, expect } from 'vitest';
import {
  CHECK_OUT_BACK_TARGET,
  CHECK_OUT_PROGRESS_STEPS,
  CHECK_OUT_TRANSITIONS,
  INITIAL_CHECK_OUT_STEP,
  backTarget,
  canTransition,
  transition,
  type CheckOutStep,
} from './checkOutFlow';

const ALL_STEPS: CheckOutStep[] = ['summary', 'billing', 'payment', 'followup', 'complete'];

describe('check-out flow state machine', () => {
  it('starts on the visit summary', () => {
    expect(INITIAL_CHECK_OUT_STEP).toBe('summary');
  });

  it('allows the full path summary -> billing -> payment -> followup -> complete', () => {
    expect(transition('summary', 'billing')).toBe('billing');
    expect(transition('billing', 'payment')).toBe('payment');
    expect(transition('payment', 'followup')).toBe('followup');
    expect(transition('followup', 'complete')).toBe('complete');
  });

  it('rejects skipping steps and leaving complete', () => {
    expect(transition('summary', 'payment')).toBe('summary');
    expect(transition('summary', 'complete')).toBe('summary');
    expect(transition('billing', 'followup')).toBe('billing');
    expect(transition('complete', 'summary')).toBe('complete');
  });

  it('keeps the current step for every illegal move', () => {
    for (const from of ALL_STEPS) {
      for (const to of ALL_STEPS) {
        const expected = canTransition(from, to) ? to : from;
        expect(transition(from, to)).toBe(expected);
      }
    }
  });

  it('only offers Back on steps with a previous step', () => {
    expect(backTarget('billing')).toBe('summary');
    expect(backTarget('payment')).toBe('billing');
    expect(backTarget('followup')).toBe('payment');
    expect(backTarget('summary')).toBeNull();
    expect(backTarget('complete')).toBeNull();
  });

  it('only ever goes Back along a legal transition', () => {
    for (const [from, back] of Object.entries(CHECK_OUT_BACK_TARGET)) {
      expect(canTransition(from as CheckOutStep, back as CheckOutStep)).toBe(true);
    }
  });

  it('defines every step and only targets known steps', () => {
    for (const step of ALL_STEPS) {
      expect(CHECK_OUT_TRANSITIONS[step]).toBeDefined();
      for (const target of CHECK_OUT_TRANSITIONS[step]) {
        expect(ALL_STEPS).toContain(target);
      }
    }
  });

  it('shows the progress bar for the four wizard steps in order', () => {
    expect(CHECK_OUT_PROGRESS_STEPS).toEqual(['summary', 'billing', 'payment', 'followup']);
  });
});
