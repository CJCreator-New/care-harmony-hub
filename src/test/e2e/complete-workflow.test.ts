import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Complete Patient Workflow E2E', () => {
  let patientId: string;
  let queueId: string;
  let consultationId: string;
  let labOrderId: string;
  let prescriptionId: string;

  beforeAll(async () => {
    // Create test patient
    const { data: patient } = await supabase
      .from('patients')
      .insert({
        first_name: 'Test',
        last_name: 'Patient',
        mrn: `TEST-${Date.now()}`,
        phone: '1234567890',
        date_of_birth: '1990-01-01',
      })
      .select()
      .single();
    patientId = patient!.id;
  });

  it('should complete check-in workflow', async () => {
    const { data: queue, error } = await supabase
      .from('queue_entries')
      .insert({
        patient_id: patientId,
        priority: 'normal',
        status: 'waiting',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(queue).toBeDefined();
    expect(queue!.status).toBe('waiting');
    queueId = queue!.id;
  });

  it('should complete triage workflow', async () => {
    const { data: vitals, error } = await supabase
      .from('vitals')
      .insert({
        patient_id: patientId,
        temperature: 98.6,
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
        heart_rate: 72,
        respiratory_rate: 16,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(vitals).toBeDefined();

    const { error: updateError } = await supabase
      .from('queue_entries')
      .update({ status: 'ready_for_doctor' })
      .eq('id', queueId);

    expect(updateError).toBeNull();
  });

  it('should complete consultation workflow', async () => {
    const { data: consultation, error } = await supabase
      .from('consultations')
      .insert({
        patient_id: patientId,
        chief_complaint: 'Test complaint',
        diagnosis: 'Test diagnosis',
        status: 'completed',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(consultation).toBeDefined();
    consultationId = consultation!.id;
  });

  it('should create lab order', async () => {
    const { data: labOrder, error } = await supabase
      .from('lab_orders')
      .insert({
        patient_id: patientId,
        consultation_id: consultationId,
        test_name: 'CBC',
        status: 'pending',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(labOrder).toBeDefined();
    labOrderId = labOrder!.id;
  });

  it('should create prescription', async () => {
    const { data: prescription, error } = await supabase
      .from('prescriptions')
      .insert({
        patient_id: patientId,
        consultation_id: consultationId,
        medication_name: 'Test Medication',
        dosage: '10mg',
        frequency: 'Once daily',
        status: 'pending',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(prescription).toBeDefined();
    prescriptionId = prescription!.id;
  });

  it('should complete lab workflow', async () => {
    const { error } = await supabase
      .from('lab_orders')
      .update({
        status: 'completed',
        result: 'Normal',
        completed_at: new Date().toISOString(),
      })
      .eq('id', labOrderId);

    expect(error).toBeNull();
  });

  it('should complete pharmacy workflow', async () => {
    const { error } = await supabase
      .from('prescriptions')
      .update({
        status: 'dispensed',
        dispensed_at: new Date().toISOString(),
      })
      .eq('id', prescriptionId);

    expect(error).toBeNull();
  });

  it('should complete billing workflow', async () => {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        patient_id: patientId,
        consultation_id: consultationId,
        total_amount: 150,
        status: 'paid',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(invoice).toBeDefined();
  });

  it('should complete queue entry', async () => {
    const { error } = await supabase
      .from('queue_entries')
      .update({ status: 'completed' })
      .eq('id', queueId);

    expect(error).toBeNull();
  });
});
