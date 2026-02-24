import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Nurse Triage Integration — T-NUR-INT-01
 *
 * Validates the nurse triage flow:
 *   queue entry created → nurse marks patient_prep_checklists.ready_for_doctor = true
 *   → appointment status updated to 'ready_for_doctor'
 *   → workflow event is emitted
 *
 * Fully self-contained (no external DB/Supabase calls).
 */

// ── Domain types ────────────────────────────────────────────────────────────

type Priority = 'low' | 'normal' | 'high' | 'urgent';
type AppointmentStatus =
  | 'checked_in'
  | 'in_prep'
  | 'ready_for_doctor'
  | 'in_consultation'
  | 'completed'
  | 'cancelled';

interface Appointment {
  id: string;
  patient_id: string;
  hospital_id: string;
  status: AppointmentStatus;
  priority: Priority;
}

interface QueueEntry {
  id: string;
  appointment_id: string;
  patient_id: string;
  hospital_id: string;
  status: 'waiting' | 'in_prep' | 'ready_for_doctor' | 'in_service';
}

interface PrepChecklist {
  id: string;
  queue_entry_id: string;
  appointment_id: string;
  hospital_id: string;
  items: Array<{ label: string; completed: boolean }>;
  ready_for_doctor: boolean;
}

interface WorkflowEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// ── In-memory triage service ──────────────────────────────────────────────

const DEFAULT_CHECKLIST_ITEMS = [
  { label: 'Verify patient identity', completed: false },
  { label: 'Record chief complaint', completed: false },
  { label: 'Measure vitals', completed: false },
  { label: 'Check allergies', completed: false },
  { label: 'Review medications', completed: false },
];

class NurseTriageService {
  private appointments: Appointment[] = [];
  private queueEntries: QueueEntry[] = [];
  private checklists: PrepChecklist[] = [];
  private events: WorkflowEvent[] = [];

  reset() {
    this.appointments = [];
    this.queueEntries = [];
    this.checklists = [];
    this.events = [];
  }

  addAppointment(apt: Appointment) {
    this.appointments.push({ ...apt });
  }

  addQueueEntry(entry: QueueEntry) {
    this.queueEntries.push({ ...entry });
  }

  createChecklist(queueEntryId: string, appointmentId: string, hospitalId: string): PrepChecklist {
    const checklist: PrepChecklist = {
      id: `chk-${Date.now()}`,
      queue_entry_id: queueEntryId,
      appointment_id: appointmentId,
      hospital_id: hospitalId,
      items: DEFAULT_CHECKLIST_ITEMS.map(i => ({ ...i })),
      ready_for_doctor: false,
    };
    this.checklists.push(checklist);
    return checklist;
  }

  completeChecklistItem(checklistId: string, label: string): PrepChecklist {
    const checklist = this.checklists.find(c => c.id === checklistId);
    if (!checklist) throw new Error(`Checklist ${checklistId} not found`);
    const item = checklist.items.find(i => i.label === label);
    if (item) item.completed = true;
    return checklist;
  }

  markReadyForDoctor(checklistId: string): PrepChecklist {
    const checklist = this.checklists.find(c => c.id === checklistId);
    if (!checklist) throw new Error(`Checklist ${checklistId} not found`);

    const allCompleted = checklist.items.every(i => i.completed);
    if (!allCompleted) {
      throw new Error('Cannot mark ready for doctor: not all checklist items completed');
    }

    checklist.ready_for_doctor = true;

    // Update queue entry status
    const queueEntry = this.queueEntries.find(q => q.id === checklist.queue_entry_id);
    if (queueEntry) queueEntry.status = 'ready_for_doctor';

    // Update appointment status
    const appointment = this.appointments.find(a => a.id === checklist.appointment_id);
    if (appointment) appointment.status = 'ready_for_doctor';

    // Emit workflow event
    this.events.push({
      type: 'PATIENT_READY_FOR_DOCTOR',
      payload: {
        checklist_id: checklistId,
        queue_entry_id: checklist.queue_entry_id,
        appointment_id: checklist.appointment_id,
        hospital_id: checklist.hospital_id,
      },
      timestamp: new Date().toISOString(),
    });

    return checklist;
  }

  getChecklist(id: string) {
    return this.checklists.find(c => c.id === id) ?? null;
  }

  getQueueEntry(id: string) {
    return this.queueEntries.find(q => q.id === id) ?? null;
  }

  getAppointment(id: string) {
    return this.appointments.find(a => a.id === id) ?? null;
  }

  getEvents() {
    return [...this.events];
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────

const service = new NurseTriageService();

describe('Nurse Triage Integration (T-NUR-INT-01)', () => {
  const HOSPITAL = 'hospital-001';
  const PATIENT = 'patient-001';
  const APT_ID = 'apt-001';
  const QUEUE_ID = 'queue-001';

  let checklistId: string;

  beforeEach(() => {
    service.reset();

    service.addAppointment({
      id: APT_ID,
      patient_id: PATIENT,
      hospital_id: HOSPITAL,
      status: 'checked_in',
      priority: 'normal',
    });

    service.addQueueEntry({
      id: QUEUE_ID,
      appointment_id: APT_ID,
      patient_id: PATIENT,
      hospital_id: HOSPITAL,
      status: 'waiting',
    });

    const checklist = service.createChecklist(QUEUE_ID, APT_ID, HOSPITAL);
    checklistId = checklist.id;
  });

  it('creates a checklist with all items incomplete', () => {
    const checklist = service.getChecklist(checklistId)!;
    expect(checklist.ready_for_doctor).toBe(false);
    expect(checklist.items.every(i => !i.completed)).toBe(true);
    expect(checklist.items).toHaveLength(5);
  });

  it('throws when marking ready before all items are complete', () => {
    expect(() => service.markReadyForDoctor(checklistId)).toThrow(
      'Cannot mark ready for doctor'
    );
  });

  it('completes individual checklist items correctly', () => {
    service.completeChecklistItem(checklistId, 'Verify patient identity');
    const checklist = service.getChecklist(checklistId)!;
    const item = checklist.items.find(i => i.label === 'Verify patient identity');
    expect(item?.completed).toBe(true);
    // Others still incomplete
    expect(checklist.items.filter(i => !i.completed)).toHaveLength(4);
  });

  it('marks ready_for_doctor when all items completed', () => {
    DEFAULT_CHECKLIST_ITEMS.forEach(item =>
      service.completeChecklistItem(checklistId, item.label)
    );

    const checklist = service.markReadyForDoctor(checklistId);
    expect(checklist.ready_for_doctor).toBe(true);
  });

  it('updates queue entry status to ready_for_doctor', () => {
    DEFAULT_CHECKLIST_ITEMS.forEach(i => service.completeChecklistItem(checklistId, i.label));
    service.markReadyForDoctor(checklistId);

    const queueEntry = service.getQueueEntry(QUEUE_ID)!;
    expect(queueEntry.status).toBe('ready_for_doctor');
  });

  it('updates appointment status to ready_for_doctor', () => {
    DEFAULT_CHECKLIST_ITEMS.forEach(i => service.completeChecklistItem(checklistId, i.label));
    service.markReadyForDoctor(checklistId);

    const appointment = service.getAppointment(APT_ID)!;
    expect(appointment.status).toBe('ready_for_doctor');
  });

  it('emits a PATIENT_READY_FOR_DOCTOR workflow event', () => {
    DEFAULT_CHECKLIST_ITEMS.forEach(i => service.completeChecklistItem(checklistId, i.label));
    service.markReadyForDoctor(checklistId);

    const events = service.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('PATIENT_READY_FOR_DOCTOR');
    expect(events[0].payload.queue_entry_id).toBe(QUEUE_ID);
    expect(events[0].payload.appointment_id).toBe(APT_ID);
    expect(events[0].payload.hospital_id).toBe(HOSPITAL);
  });

  it('event payload contains a valid ISO timestamp', () => {
    DEFAULT_CHECKLIST_ITEMS.forEach(i => service.completeChecklistItem(checklistId, i.label));
    service.markReadyForDoctor(checklistId);
    const event = service.getEvents()[0];
    expect(() => new Date(event.timestamp)).not.toThrow();
    expect(isNaN(new Date(event.timestamp).getTime())).toBe(false);
  });
});
