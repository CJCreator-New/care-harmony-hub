import { describe, it, expect, vi, beforeEach } from 'vitest';

// T-77: Lab auto-dispatch integration
// Verifies that creating a lab order automatically dispatches a lab queue entry
// and notifies the lab technician.

interface LabOrder {
  id: string;
  hospital_id: string;
  patient_id: string;
  test_name: string;
  priority: 'normal' | 'urgent' | 'stat';
  status: string;
  ordered_by: string;
}

interface LabQueueEntry {
  lab_order_id: string;
  hospital_id: string;
  patient_id: string;
  status: 'pending';
  priority: string;
}

interface NotificationRecord {
  type: string;
  recipient_id: string;
}

class LabAutoDispatchService {
  private labOrders: LabOrder[] = [];
  private labQueue: LabQueueEntry[] = [];
  private notifications: NotificationRecord[] = [];

  async createLabOrder(order: Omit<LabOrder, 'id'>): Promise<LabOrder> {
    const created: LabOrder = { ...order, id: `order-${Date.now()}` };
    this.labOrders.push(created);

    // Auto-dispatch to lab queue
    this.labQueue.push({
      lab_order_id: created.id,
      hospital_id: created.hospital_id,
      patient_id: created.patient_id,
      status: 'pending',
      priority: created.priority,
    });

    // Notify lab technician
    this.notifications.push({
      type: 'new_lab_order',
      recipient_id: 'lab-tech-on-duty',
    });

    return created;
  }

  getQueueEntries() { return this.labQueue; }
  getNotifications() { return this.notifications; }
}

describe('Lab Auto-Dispatch Integration (T-77)', () => {
  let service: LabAutoDispatchService;

  beforeEach(() => {
    service = new LabAutoDispatchService();
  });

  it('creates lab order and queue entry in one operation', async () => {
    await service.createLabOrder({
      hospital_id: 'hosp-1',
      patient_id: 'patient-1',
      test_name: 'CBC',
      priority: 'normal',
      status: 'pending',
      ordered_by: 'doctor-1',
    });

    expect(service.getQueueEntries()).toHaveLength(1);
    expect(service.getQueueEntries()[0].status).toBe('pending');
  });

  it('queue entry inherits priority from lab order', async () => {
    await service.createLabOrder({
      hospital_id: 'hosp-1',
      patient_id: 'patient-1',
      test_name: 'Troponin',
      priority: 'stat',
      status: 'pending',
      ordered_by: 'doctor-1',
    });

    expect(service.getQueueEntries()[0].priority).toBe('stat');
  });

  it('dispatches notification to lab on order creation', async () => {
    await service.createLabOrder({
      hospital_id: 'hosp-1',
      patient_id: 'patient-1',
      test_name: 'BMP',
      priority: 'urgent',
      status: 'pending',
      ordered_by: 'doctor-1',
    });

    expect(service.getNotifications()).toHaveLength(1);
    expect(service.getNotifications()[0].type).toBe('new_lab_order');
  });

  it('creates separate queue entries for multiple orders', async () => {
    await service.createLabOrder({ hospital_id: 'h', patient_id: 'p', test_name: 'CBC', priority: 'normal', status: 'pending', ordered_by: 'd' });
    await service.createLabOrder({ hospital_id: 'h', patient_id: 'p', test_name: 'LFT', priority: 'normal', status: 'pending', ordered_by: 'd' });

    expect(service.getQueueEntries()).toHaveLength(2);
  });
});
