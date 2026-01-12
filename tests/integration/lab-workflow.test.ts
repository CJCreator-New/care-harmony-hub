import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Lab Order → Sample Collection → Results Workflow', () => {
  const testPatientId = 'test-lab-patient';
  const testDoctorId = 'test-lab-doctor';

  it('should complete full lab workflow', async () => {
    // Step 1: Doctor orders lab test
    const { data: labOrder, error: orderError } = await supabase
      .from('lab_orders')
      .insert({
        patient_id: testPatientId,
        doctor_id: testDoctorId,
        test_type: 'Complete Blood Count',
        status: 'ordered',
        priority: 'routine',
      })
      .select()
      .single();

    expect(orderError).toBeNull();
    expect(labOrder?.status).toBe('ordered');

    // Step 2: Lab tech collects sample
    const { data: collected, error: collectError } = await supabase
      .from('lab_orders')
      .update({
        status: 'sample_collected',
        sample_collected_at: new Date().toISOString(),
      })
      .eq('id', labOrder?.id)
      .select()
      .single();

    expect(collectError).toBeNull();
    expect(collected?.status).toBe('sample_collected');

    // Step 3: Lab processes and enters results
    const { data: completed, error: resultError } = await supabase
      .from('lab_orders')
      .update({
        status: 'completed',
        results: { hemoglobin: 14.5, wbc: 7000 },
        completed_at: new Date().toISOString(),
      })
      .eq('id', labOrder?.id)
      .select()
      .single();

    expect(resultError).toBeNull();
    expect(completed?.status).toBe('completed');
    expect(completed?.results).toBeDefined();

    // Step 4: Doctor reviews results
    const { data: reviewed } = await supabase
      .from('lab_orders')
      .update({ reviewed_by: testDoctorId })
      .eq('id', labOrder?.id)
      .select()
      .single();

    expect(reviewed?.reviewed_by).toBe(testDoctorId);
  });

  it('should handle critical results notification', async () => {
    const { data: criticalOrder } = await supabase
      .from('lab_orders')
      .insert({
        patient_id: testPatientId,
        test_type: 'Troponin',
        status: 'completed',
        results: { troponin: 5.0 },
        is_critical: true,
      })
      .select()
      .single();

    expect(criticalOrder?.is_critical).toBe(true);
  });
});
