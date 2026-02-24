import { describe, it, expect, beforeEach } from 'vitest';

// T-79: SmartScheduler booking integration
// Verifies that appointment slot booking respects availability and prevents double-booking

interface TimeSlot {
  id: string;
  doctor_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
}

interface Appointment {
  id: string;
  slot_id: string;
  patient_id: string;
  doctor_id: string;
  slot_date: string;
  start_time: string;
}

class SmartScheduler {
  private slots: TimeSlot[];
  private appointments: Appointment[] = [];

  constructor(slots: TimeSlot[]) {
    this.slots = slots.map(s => ({ ...s }));
  }

  async bookSlot(slotId: string, patientId: string): Promise<Appointment> {
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) throw new Error('Slot not found');
    if (slot.is_booked) throw new Error('Slot already booked');

    slot.is_booked = true;

    const appointment: Appointment = {
      id: `appt-${Date.now()}`,
      slot_id: slot.id,
      patient_id: patientId,
      doctor_id: slot.doctor_id,
      slot_date: slot.slot_date,
      start_time: slot.start_time,
    };
    this.appointments.push(appointment);
    return appointment;
  }

  getAvailableSlots(doctorId: string): TimeSlot[] {
    return this.slots.filter(s => s.doctor_id === doctorId && !s.is_booked);
  }
}

const mockSlots: TimeSlot[] = [
  { id: 'slot-1', doctor_id: 'doc-1', slot_date: '2024-06-15', start_time: '09:00', end_time: '09:30', is_booked: false },
  { id: 'slot-2', doctor_id: 'doc-1', slot_date: '2024-06-15', start_time: '09:30', end_time: '10:00', is_booked: false },
  { id: 'slot-3', doctor_id: 'doc-1', slot_date: '2024-06-15', start_time: '10:00', end_time: '10:30', is_booked: true },
];

describe('SmartScheduler Booking Integration (T-79)', () => {
  let scheduler: SmartScheduler;

  beforeEach(() => {
    scheduler = new SmartScheduler(mockSlots);
  });

  it('returns only available slots for a doctor', () => {
    const available = scheduler.getAvailableSlots('doc-1');
    expect(available).toHaveLength(2);
    expect(available.every(s => !s.is_booked)).toBe(true);
  });

  it('books an available slot successfully', async () => {
    const appt = await scheduler.bookSlot('slot-1', 'patient-1');
    expect(appt.patient_id).toBe('patient-1');
    expect(appt.slot_id).toBe('slot-1');
  });

  it('marks slot as booked after booking', async () => {
    await scheduler.bookSlot('slot-1', 'patient-1');
    const available = scheduler.getAvailableSlots('doc-1');
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('slot-2');
  });

  it('prevents double-booking the same slot', async () => {
    await scheduler.bookSlot('slot-1', 'patient-1');
    await expect(scheduler.bookSlot('slot-1', 'patient-2')).rejects.toThrow('Slot already booked');
  });

  it('throws for a non-existent slot id', async () => {
    await expect(scheduler.bookSlot('slot-999', 'patient-1')).rejects.toThrow('Slot not found');
  });
});
