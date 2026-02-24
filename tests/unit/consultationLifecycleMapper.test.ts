import { describe, it, expect } from 'vitest';

// T-71: Consultation lifecycle mapper
// Verifies that consultation status transitions follow the defined lifecycle:
// scheduled → checked_in → in_progress → completed | cancelled

type ConsultationStatus = 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled';

const VALID_TRANSITIONS: Record<ConsultationStatus, ConsultationStatus[]> = {
  scheduled: ['checked_in', 'cancelled'],
  checked_in: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function isValidTransition(from: ConsultationStatus, to: ConsultationStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

function mapConsultationEventToStatus(event: string, current: ConsultationStatus): ConsultationStatus {
  const eventMap: Record<string, ConsultationStatus> = {
    start_consultation: 'in_progress',
    check_in: 'checked_in',
    complete_consultation: 'completed',
    cancel_consultation: 'cancelled',
  };
  const target = eventMap[event];
  if (!target) return current;
  return isValidTransition(current, target) ? target : current;
}

describe('Consultation Lifecycle Mapper (T-71)', () => {
  it('transitions scheduled → checked_in on check_in event', () => {
    expect(mapConsultationEventToStatus('check_in', 'scheduled')).toBe('checked_in');
  });

  it('transitions checked_in → in_progress on start_consultation event', () => {
    expect(mapConsultationEventToStatus('start_consultation', 'checked_in')).toBe('in_progress');
  });

  it('transitions in_progress → completed on complete_consultation event', () => {
    expect(mapConsultationEventToStatus('complete_consultation', 'in_progress')).toBe('completed');
  });

  it('allows cancellation from any active state', () => {
    const activeStates: ConsultationStatus[] = ['scheduled', 'checked_in', 'in_progress'];
    for (const state of activeStates) {
      expect(mapConsultationEventToStatus('cancel_consultation', state)).toBe('cancelled');
    }
  });

  it('does not allow transition out of completed', () => {
    expect(mapConsultationEventToStatus('check_in', 'completed')).toBe('completed');
    expect(mapConsultationEventToStatus('start_consultation', 'completed')).toBe('completed');
  });

  it('does not allow transition out of cancelled', () => {
    expect(mapConsultationEventToStatus('check_in', 'cancelled')).toBe('cancelled');
  });

  it('ignores unknown events and returns current status', () => {
    expect(mapConsultationEventToStatus('unknown_event', 'scheduled')).toBe('scheduled');
  });
});
