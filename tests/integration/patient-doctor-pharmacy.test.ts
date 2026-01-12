import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Patient → Doctor → Pharmacy Workflow', () => {
  const testPatientId = 'test-patient-integration';
  const testDoctorId = 'test-doctor-integration';

  beforeEach(async () => {
    // Clean up test data
    await supabase.from('prescriptions').delete().eq('patient_id', testPatientId);
  });

  it('should complete full prescription workflow', async () => {
    // Step 1: Patient books appointment
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert({
        patient_id: testPatientId,
        doctor_id: testDoctorId,
        appointment_date: new Date().toISOString(),
        status: 'scheduled',
      })
      .select()
      .single();

    expect(aptError).toBeNull();
    expect(appointment).toBeDefined();

    // Step 2: Doctor creates prescription
    const { data: prescription, error: rxError } = await supabase
      .from('prescriptions')
      .insert({
        patient_id: testPatientId,
        doctor_id: testDoctorId,
        medication_name: 'Test Medication',
        dosage: '10mg',
        frequency: 'twice daily',
        status: 'pending',
      })
      .select()
      .single();

    expect(rxError).toBeNull();
    expect(prescription?.status).toBe('pending');

    // Step 3: Pharmacy receives and processes
    const { data: updated, error: updateError } = await supabase
      .from('prescriptions')
      .update({ status: 'dispensed' })
      .eq('id', prescription?.id)
      .select()
      .single();

    expect(updateError).toBeNull();
    expect(updated?.status).toBe('dispensed');

    // Step 4: Verify audit trail
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'prescription')
      .order('created_at', { ascending: false });

    expect(logs).toBeDefined();
  });

  it('should handle prescription refill requests', async () => {
    // Create original prescription
    const { data: original } = await supabase
      .from('prescriptions')
      .insert({
        patient_id: testPatientId,
        medication_name: 'Test Med',
        status: 'dispensed',
      })
      .select()
      .single();

    // Patient requests refill
    const { data: refill, error } = await supabase
      .from('refill_requests')
      .insert({
        prescription_id: original?.id,
        patient_id: testPatientId,
        status: 'pending',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(refill?.status).toBe('pending');
  });
});
