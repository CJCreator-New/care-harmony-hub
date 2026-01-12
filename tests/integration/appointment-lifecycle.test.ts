import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Appointment Lifecycle Integration', () => {
  const testPatientId = 'test-apt-patient';
  const testDoctorId = 'test-apt-doctor';

  it('should complete full appointment lifecycle', async () => {
    // Step 1: Patient books appointment
    const { data: appointment } = await supabase
      .from('appointments')
      .insert({
        patient_id: testPatientId,
        doctor_id: testDoctorId,
        appointment_date: new Date(Date.now() + 86400000).toISOString(),
        status: 'scheduled',
        reason: 'Annual checkup',
      })
      .select()
      .single();

    expect(appointment?.status).toBe('scheduled');

    // Step 2: Patient checks in
    const { data: checkedIn } = await supabase
      .from('appointments')
      .update({
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
      })
      .eq('id', appointment?.id)
      .select()
      .single();

    expect(checkedIn?.status).toBe('checked_in');

    // Step 3: Doctor starts consultation
    const { data: consultation } = await supabase
      .from('consultations')
      .insert({
        appointment_id: appointment?.id,
        patient_id: testPatientId,
        doctor_id: testDoctorId,
        status: 'in_progress',
      })
      .select()
      .single();

    expect(consultation?.status).toBe('in_progress');

    // Step 4: Complete consultation
    const { data: completed } = await supabase
      .from('consultations')
      .update({
        status: 'completed',
        diagnosis: 'Healthy',
        notes: 'Patient in good health',
      })
      .eq('id', consultation?.id)
      .select()
      .single();

    expect(completed?.status).toBe('completed');

    // Step 5: Generate billing
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        patient_id: testPatientId,
        appointment_id: appointment?.id,
        amount: 150.00,
        status: 'pending',
      })
      .select()
      .single();

    expect(invoice?.status).toBe('pending');
    expect(invoice?.amount).toBe(150.00);
  });

  it('should handle appointment cancellation', async () => {
    const { data: appointment } = await supabase
      .from('appointments')
      .insert({
        patient_id: testPatientId,
        doctor_id: testDoctorId,
        status: 'scheduled',
      })
      .select()
      .single();

    const { data: cancelled } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Patient request',
      })
      .eq('id', appointment?.id)
      .select()
      .single();

    expect(cancelled?.status).toBe('cancelled');
  });
});
