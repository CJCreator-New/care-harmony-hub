/**
 * T-P06: Patient Queue Check-In Integration Test
 * Verifies the full check-in lifecycle:
 *   patient arrives → receptionist creates queue entry →
 *   queue reflects correct position → doctor picks up patient
 *
 * Uses an in-memory service that mirrors the real DB schema so tests
 * run without a live Supabase connection.
 *
 * Pyramid layer: INTEGRATION (20%)
 * F.I.R.S.T.: Fast, Isolated (fresh state per test), Repeatable, Self-validating
 */
import { describe, it, expect, beforeEach } from 'vitest';

// ── Types ──────────────────────────────────────────────────────────────────

interface QueueEntry {
  id: string;
  patient_id: string;
  hospital_id: string;
  department: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'cancelled';
  check_in_time: string;
  called_at?: string;
  consultation_start?: string;
  assigned_doctor_id?: string;
  position: number;
  created_at: string;
  updated_at: string;
}

// ── In-Memory Queue Service ────────────────────────────────────────────────

class QueueService {
  private entries: QueueEntry[] = [];
  private _idSeq = 0;
  private _now: () => string;

  constructor(nowFn?: () => string) {
    this._now = nowFn ?? (() => new Date().toISOString());
  }

  private nextId(): string {
    return `q-${++this._idSeq}`;
  }

  /** Receptionist checks in a patient. */
  checkIn(
    patientId: string,
    hospitalId: string,
    department: string,
    priority: QueueEntry['priority'] = 'routine'
  ): QueueEntry {
    const waitingInDept = this.entries.filter(
      (e) => e.department === department && e.status === 'waiting'
    );
    const entry: QueueEntry = {
      id: this.nextId(),
      patient_id: patientId,
      hospital_id: hospitalId,
      department,
      priority,
      status: 'waiting',
      check_in_time: this._now(),
      position: waitingInDept.length + 1,
      created_at: this._now(),
      updated_at: this._now(),
    };
    this.entries.push(entry);
    return entry;
  }

  /** Returns all waiting entries for a department, sorted by position. */
  getWaiting(hospitalId: string, department: string): QueueEntry[] {
    return this.entries
      .filter((e) => e.hospital_id === hospitalId && e.department === department && e.status === 'waiting')
      .sort((a, b) => a.position - b.position);
  }

  /** Doctor calls the next patient. */
  callNext(doctorId: string, hospitalId: string, department: string): QueueEntry | null {
    const next = this.getWaiting(hospitalId, department)[0];
    if (!next) return null;
    next.status = 'called';
    next.called_at = this._now();
    next.assigned_doctor_id = doctorId;
    next.updated_at = this._now();
    return next;
  }

  /** Patient enters the consultation room. */
  startConsultation(entryId: string): QueueEntry | null {
    const entry = this.entries.find((e) => e.id === entryId);
    if (!entry || entry.status !== 'called') return null;
    entry.status = 'in_consultation';
    entry.consultation_start = this._now();
    entry.updated_at = this._now();
    return entry;
  }

  /** Consultation finishes; patient is discharged from the queue. */
  complete(entryId: string): QueueEntry | null {
    const entry = this.entries.find((e) => e.id === entryId);
    if (!entry) return null;
    entry.status = 'completed';
    entry.updated_at = this._now();
    return entry;
  }

  /** Cancel a waiting entry (patient leaves). */
  cancel(entryId: string): QueueEntry | null {
    const entry = this.entries.find((e) => e.id === entryId);
    if (!entry || entry.status !== 'waiting') return null;
    entry.status = 'cancelled';
    entry.updated_at = this._now();
    return entry;
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Patient Queue Check-In Integration (T-P06)', () => {
  let svc: QueueService;
  const HOSPITAL = 'hospital-1';
  const DEPT = 'general';
  const DOCTOR = 'doctor-1';

  beforeEach(() => {
    svc = new QueueService(() => '2024-06-01T09:00:00.000Z');
  });

  it('creates a waiting entry on check-in', () => {
    const entry = svc.checkIn('patient-1', HOSPITAL, DEPT);
    expect(entry.status).toBe('waiting');
    expect(entry.patient_id).toBe('patient-1');
    expect(entry.position).toBe(1);
  });

  it('assigns sequential positions to multiple check-ins', () => {
    svc.checkIn('patient-1', HOSPITAL, DEPT);
    const second = svc.checkIn('patient-2', HOSPITAL, DEPT);
    expect(second.position).toBe(2);
  });

  it('getWaiting returns entries in arrival order', () => {
    svc.checkIn('patient-1', HOSPITAL, DEPT);
    svc.checkIn('patient-2', HOSPITAL, DEPT);
    const waiting = svc.getWaiting(HOSPITAL, DEPT);
    expect(waiting[0].patient_id).toBe('patient-1');
    expect(waiting[1].patient_id).toBe('patient-2');
  });

  it('getWaiting only returns entries for the specified hospital', () => {
    svc.checkIn('patient-1', HOSPITAL, DEPT);
    svc.checkIn('patient-X', 'other-hospital', DEPT);
    expect(svc.getWaiting(HOSPITAL, DEPT)).toHaveLength(1);
  });

  it('doctor calling next sets status to "called" and assigns doctor', () => {
    svc.checkIn('patient-1', HOSPITAL, DEPT);
    const called = svc.callNext(DOCTOR, HOSPITAL, DEPT);
    expect(called).not.toBeNull();
    expect(called!.status).toBe('called');
    expect(called!.assigned_doctor_id).toBe(DOCTOR);
  });

  it('callNext returns null when queue is empty', () => {
    expect(svc.callNext(DOCTOR, HOSPITAL, DEPT)).toBeNull();
  });

  it('startConsultation transitions "called" → "in_consultation"', () => {
    svc.checkIn('patient-1', HOSPITAL, DEPT);
    const called = svc.callNext(DOCTOR, HOSPITAL, DEPT)!;
    const inConsult = svc.startConsultation(called.id);
    expect(inConsult!.status).toBe('in_consultation');
    expect(inConsult!.consultation_start).toBeDefined();
  });

  it('startConsultation returns null if entry status is not "called"', () => {
    svc.checkIn('patient-1', HOSPITAL, DEPT);
    const entry = svc.getWaiting(HOSPITAL, DEPT)[0];
    expect(svc.startConsultation(entry.id)).toBeNull(); // still 'waiting'
  });

  it('complete transitions to "completed"', () => {
    svc.checkIn('patient-1', HOSPITAL, DEPT);
    const called = svc.callNext(DOCTOR, HOSPITAL, DEPT)!;
    svc.startConsultation(called.id);
    const completed = svc.complete(called.id);
    expect(completed!.status).toBe('completed');
  });

  it('completed patient is removed from the waiting list', () => {
    svc.checkIn('patient-1', HOSPITAL, DEPT);
    const called = svc.callNext(DOCTOR, HOSPITAL, DEPT)!;
    svc.startConsultation(called.id);
    svc.complete(called.id);
    expect(svc.getWaiting(HOSPITAL, DEPT)).toHaveLength(0);
  });

  it('cancel removes patient from waiting queue', () => {
    const entry = svc.checkIn('patient-1', HOSPITAL, DEPT);
    svc.cancel(entry.id);
    expect(svc.getWaiting(HOSPITAL, DEPT)).toHaveLength(0);
  });

  it('cancel does not affect non-waiting entries', () => {
    svc.checkIn('patient-1', HOSPITAL, DEPT);
    const called = svc.callNext(DOCTOR, HOSPITAL, DEPT)!;
    expect(svc.cancel(called.id)).toBeNull(); // status is 'called', not 'waiting'
  });

  it('full service lifecycle: check-in → call → consult → complete', () => {
    const entry = svc.checkIn('patient-1', HOSPITAL, DEPT);
    expect(entry.status).toBe('waiting');

    const called = svc.callNext(DOCTOR, HOSPITAL, DEPT)!;
    expect(called.status).toBe('called');

    const inConsult = svc.startConsultation(called.id)!;
    expect(inConsult.status).toBe('in_consultation');

    const completed = svc.complete(called.id)!;
    expect(completed.status).toBe('completed');

    expect(svc.getWaiting(HOSPITAL, DEPT)).toHaveLength(0);
  });

  it('urgent patients use the same queue position — priority ordering is caller responsibility', () => {
    // Service stores priority but position is FIFO; callers sort urgent to front
    const urgent = svc.checkIn('urgent-patient', HOSPITAL, DEPT, 'urgent');
    const routine = svc.checkIn('routine-patient', HOSPITAL, DEPT, 'routine');
    expect(urgent.priority).toBe('urgent');
    expect(routine.priority).toBe('routine');
  });
});
