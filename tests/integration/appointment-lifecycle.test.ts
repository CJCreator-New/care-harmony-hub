import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/query-helper';

describe('Appointment Lifecycle Integration', () => {
  const testHospitalId = 'test-hospital-id';
  const testPatientId = 'test-apt-patient';
  const testDoctorId = 'test-apt-doctor';

  it('should complete full appointment lifecycle', async () => {
    // Step 1: Patient books appointment
    const { data: appointment } = await supabase
      .from('appointments')
      .insert({
        patient_id: testPatientId,
        doctor_id: testDoctorId,
        hospital_id: testHospitalId,
        scheduled_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        scheduled_time: '10:00',
        appointment_type: 'checkup',
        reason_for_visit: 'Annual checkup',
      })
      .select()
      .single();

    expect(appointment?.status).toBe('scheduled');

    if (!appointment) return;

    // Step 2: Patient checks in
    const { data: checkedIn } = await supabase
      .from('appointments')
      .update({
        status: 'checked_in',
        check_in_time: new Date().toISOString(),
      })
      .eq('id', appointment.id)
      .select()
      .single();

    expect(checkedIn?.status).toBe('checked_in');

    // Step 3: Doctor starts consultation
    const { data: consultation } = await supabase
      .from('consultations')
      .insert({
        appointment_id: appointment.id,
        patient_id: testPatientId,
        doctor_id: testDoctorId,
        hospital_id: testHospitalId,
        status: 'in_progress',
      })
      .select()
      .single();

    expect(consultation?.status).toBe('in_progress');

    if (!consultation) return;

    // Step 4: Complete consultation
    const { data: completed } = await supabase
      .from('consultations')
      .update({
        status: 'completed',
        final_diagnosis: ['Healthy'],
        clinical_notes: 'Patient in good health',
      })
      .eq('id', consultation.id)
      .select()
      .single();

    expect(completed?.status).toBe('completed');

    // Step 5: Generate billing
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        patient_id: testPatientId,
        appointment_id: appointment.id,
        hospital_id: testHospitalId,
        invoice_number: 'TEST-INV-001',
        total: 150.00,
        status: 'pending',
      })
      .select()
      .single();

    expect(invoice?.status).toBe('pending');
    expect(invoice?.total).toBe(150.00);
  });

  it('should handle appointment cancellation', async () => {
    const { data: appointment } = await supabase
      .from('appointments')
      .insert({
        patient_id: testPatientId,
        doctor_id: testDoctorId,
        hospital_id: testHospitalId,
        scheduled_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        scheduled_time: '14:00',
        appointment_type: 'follow-up',
        status: 'scheduled',
      })
      .select()
      .single();

    if (!appointment) return;

    const { data: cancelled } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: 'Patient request',
      })
      .eq('id', appointment.id)
      .select()
      .single();

    expect(cancelled?.status).toBe('cancelled');
  });
});
