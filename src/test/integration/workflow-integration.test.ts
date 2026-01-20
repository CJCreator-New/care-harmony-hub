import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('End-to-End Patient Flow', () => {
  let testPatientId: string;
  let testAppointmentId: string;
  let testQueueId: string;
  let testConsultationId: string;

  beforeAll(async () => {
    // Create test patient
    const { data: patient } = await supabase
      .from('patients')
      .insert({
        mrn: 'TEST001',
        first_name: 'Test',
        last_name: 'Patient',
        date_of_birth: '1990-01-01',
      })
      .select()
      .single();
    
    testPatientId = patient.id;
  });

  it('should complete check-in workflow', async () => {
    // 1. Create appointment
    const { data: appointment } = await supabase
      .from('appointments')
      .insert({
        patient_id: testPatientId,
        scheduled_date: new Date().toISOString(),
        status: 'scheduled',
      })
      .select()
      .single();

    testAppointmentId = appointment.id;
    expect(appointment).toBeDefined();

    // 2. Check in patient
    const { data: queue } = await supabase
      .from('patient_queue')
      .insert({
        patient_id: testPatientId,
        appointment_id: testAppointmentId,
        status: 'waiting',
      })
      .select()
      .single();

    testQueueId = queue.id;
    expect(queue.status).toBe('waiting');
  });

  it('should complete triage workflow', async () => {
    // 1. Record vitals
    const { data: vitals } = await supabase
      .from('vital_signs')
      .insert({
        patient_id: testPatientId,
        systolic: 120,
        diastolic: 80,
        heart_rate: 72,
        temperature: 37.0,
      })
      .select()
      .single();

    expect(vitals).toBeDefined();

    // 2. Mark ready for doctor
    const { data: updatedQueue } = await supabase
      .from('patient_queue')
      .update({ status: 'ready_for_doctor' })
      .eq('id', testQueueId)
      .select()
      .single();

    expect(updatedQueue.status).toBe('ready_for_doctor');
  });

  it('should complete consultation workflow', async () => {
    // 1. Start consultation
    const { data: consultation } = await supabase
      .from('consultations')
      .insert({
        patient_id: testPatientId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    testConsultationId = consultation.id;
    expect(consultation.status).toBe('in_progress');

    // 2. Complete consultation
    const { data: completed } = await supabase
      .from('consultations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', testConsultationId)
      .select()
      .single();

    expect(completed.status).toBe('completed');
  });

  it('should complete billing workflow', async () => {
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        patient_id: testPatientId,
        consultation_id: testConsultationId,
        total_amount: 150.00,
        status: 'pending',
      })
      .select()
      .single();

    expect(invoice).toBeDefined();
    expect(invoice.total_amount).toBe(150.00);
  });
});

describe('Notification System', () => {
  it('should send patient checked-in notification', async () => {
    const { data } = await supabase
      .from('notifications')
      .insert({
        type: 'info',
        title: 'Patient Checked In',
        message: 'Test notification',
        priority: 'normal',
      })
      .select()
      .single();

    expect(data).toBeDefined();
  });
});

describe('Workflow Metrics', () => {
  it('should calculate workflow metrics', async () => {
    const { data } = await supabase
      .from('workflow_metrics')
      .select('*')
      .limit(1);

    expect(data).toBeDefined();
  });
});
