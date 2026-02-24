import { describe, it, expect, beforeEach } from 'vitest';

// T-78: Walk-in check-in integration
// Validates the walk-in patient registration → queue entry creation flow

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string;
  hospital_id: string;
}

interface QueueEntry {
  id: string;
  patient_id: string;
  hospital_id: string;
  queue_number: number;
  status: 'waiting';
  check_in_time: string;
}

class WalkInCheckInService {
  private patients: Patient[] = [];
  private queue: QueueEntry[] = [];
  private nextQueueNumber = 1;

  async checkInWalkIn(
    hospitalId: string,
    firstName: string,
    lastName: string
  ): Promise<{ patient: Patient; queueEntry: QueueEntry }> {
    if (!hospitalId || !firstName || !lastName) {
      throw new Error('hospitalId, firstName and lastName are required');
    }

    // Create or find patient
    let patient = this.patients.find(
      p => p.first_name === firstName && p.last_name === lastName && p.hospital_id === hospitalId
    );

    if (!patient) {
      patient = {
        id: `patient-${Date.now()}`,
        first_name: firstName,
        last_name: lastName,
        mrn: `WLK-${String(this.patients.length + 1).padStart(6, '0')}`,
        hospital_id: hospitalId,
      };
      this.patients.push(patient);
    }

    // Create queue entry
    const queueEntry: QueueEntry = {
      id: `queue-${Date.now()}`,
      patient_id: patient.id,
      hospital_id: hospitalId,
      queue_number: this.nextQueueNumber++,
      status: 'waiting',
      check_in_time: new Date().toISOString(),
    };
    this.queue.push(queueEntry);

    return { patient, queueEntry };
  }

  getQueue() { return this.queue; }
  getPatients() { return this.patients; }
}

describe('Walk-In Check-In Integration (T-78)', () => {
  let service: WalkInCheckInService;

  beforeEach(() => {
    service = new WalkInCheckInService();
  });

  it('creates patient and queue entry for new walk-in', async () => {
    const result = await service.checkInWalkIn('hosp-1', 'John', 'Doe');

    expect(result.patient.first_name).toBe('John');
    expect(result.patient.mrn).toMatch(/^WLK-/);
    expect(result.queueEntry.status).toBe('waiting');
  });

  it('assigns sequential queue numbers', async () => {
    const first = await service.checkInWalkIn('hosp-1', 'Alice', 'Smith');
    const second = await service.checkInWalkIn('hosp-1', 'Bob', 'Jones');

    expect(second.queueEntry.queue_number).toBe(first.queueEntry.queue_number + 1);
  });

  it('re-uses existing patient record on second check-in', async () => {
    await service.checkInWalkIn('hosp-1', 'Alice', 'Smith');
    await service.checkInWalkIn('hosp-1', 'Alice', 'Smith');

    expect(service.getPatients()).toHaveLength(1);
    expect(service.getQueue()).toHaveLength(2);
  });

  it('stamps check_in_time as ISO string', async () => {
    const result = await service.checkInWalkIn('hosp-1', 'Tom', 'Brown');
    expect(() => new Date(result.queueEntry.check_in_time)).not.toThrow();
    expect(result.queueEntry.check_in_time).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('throws when required fields are missing', async () => {
    await expect(service.checkInWalkIn('', 'John', 'Doe')).rejects.toThrow();
    await expect(service.checkInWalkIn('hosp-1', '', 'Doe')).rejects.toThrow();
    await expect(service.checkInWalkIn('hosp-1', 'John', '')).rejects.toThrow();
  });
});
