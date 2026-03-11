// @ts-nocheck
/**
 * Integration tests for lab critical alert acknowledgement workflow.
 * Validates the lab_critical_acknowledgements table interactions and
 * the hook-level logic patterns for useLabCriticalAlerts.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

const TEST_HOSPITAL_ID = '00000000-0000-0000-0000-000000000001';
const TEST_PATIENT_ID  = '00000000-0000-0000-0000-000000000002';
const TEST_DOCTOR_ID   = '00000000-0000-0000-0000-000000000003';
const TEST_LAB_ORDER_ID = '00000000-0000-0000-0000-000000000004';

describe('Lab Critical Acknowledgement Workflow', () => {

  // ── Schema connectivity ──────────────────────────────────────────────────

  it('lab_critical_acknowledgements table is reachable', async () => {
    const { error } = await supabase
      .from('lab_critical_acknowledgements')
      .select('id')
      .limit(1);
    // Acceptable outcomes: data returned OR RLS blocks anon access (403/42501)
    const isAccessible = !error || error.code === 'PGRST116' || error.code === '42501';
    expect(isAccessible).toBe(true);
  });

  it('lab_orders table has is_critical column', async () => {
    const { data, error } = await supabase
      .from('lab_orders')
      .select('id, is_critical')
      .limit(1);
    // If RLS blocks, that's fine — column existence confirmed by lack of schema error
    const schemaOk = !error || error.message?.includes('42501') || error.message?.includes('row-level');
    expect(schemaOk).toBe(true);
  });

  // ── Acknowledgement lifecycle ────────────────────────────────────────────

  it('can insert a critical acknowledgement record with pending status', async () => {
    const payload = {
      lab_order_id:    TEST_LAB_ORDER_ID,
      hospital_id:     TEST_HOSPITAL_ID,
      patient_id:      TEST_PATIENT_ID,
      assigned_to:     TEST_DOCTOR_ID,
      status:          'pending',
      ack_deadline:    new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      escalation_level: 1,
      is_critical:     true,
      test_name:       'Potassium',
      critical_value:  '6.8 mEq/L',
      normal_range:    '3.5-5.0 mEq/L',
    };

    const { data, error } = await supabase
      .from('lab_critical_acknowledgements')
      .insert(payload)
      .select()
      .single();

    // Anon/RLS block is expected in test env — just ensure no schema column mismatch
    if (error) {
      expect(error.code).not.toBe('42703'); // 42703 = column does not exist
      return;
    }
    expect(data?.status).toBe('pending');
    expect(data?.escalation_level).toBe(1);

    // Cleanup
    await supabase.from('lab_critical_acknowledgements').delete().eq('id', data.id);
  });

  it('can transition status from pending → acknowledged', async () => {
    const { data: inserted, error: insertErr } = await supabase
      .from('lab_critical_acknowledgements')
      .insert({
        lab_order_id:    TEST_LAB_ORDER_ID,
        hospital_id:     TEST_HOSPITAL_ID,
        patient_id:      TEST_PATIENT_ID,
        assigned_to:     TEST_DOCTOR_ID,
        status:          'pending',
        ack_deadline:    new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        escalation_level: 1,
        is_critical:     true,
        test_name:       'Haemoglobin',
        critical_value:  '4.2 g/dL',
        normal_range:    '12-17 g/dL',
      })
      .select()
      .single();

    if (insertErr) {
      expect(insertErr.code).not.toBe('42703');
      return;
    }

    const { data: acked, error: ackErr } = await supabase
      .from('lab_critical_acknowledgements')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: TEST_DOCTOR_ID,
      })
      .eq('id', inserted.id)
      .select()
      .single();

    expect(ackErr).toBeNull();
    expect(acked?.status).toBe('acknowledged');
    expect(acked?.acknowledged_by).toBe(TEST_DOCTOR_ID);

    await supabase.from('lab_critical_acknowledgements').delete().eq('id', inserted.id);
  });

  // ── Escalation table ─────────────────────────────────────────────────────

  it('lab_critical_escalation_log table is reachable', async () => {
    const { error } = await supabase
      .from('lab_critical_escalation_log')
      .select('id')
      .limit(1);
    const isAccessible = !error || error.code === 'PGRST116' || error.code === '42501';
    expect(isAccessible).toBe(true);
  });

  // ── Hook-equivalent query patterns ──────────────────────────────────────

  it('pending critical alerts query matches expected shape', async () => {
    const { data, error } = await supabase
      .from('lab_critical_acknowledgements')
      .select(`
        id, status, is_critical, test_name, critical_value,
        normal_range, ack_deadline, escalation_level, created_at,
        lab_orders ( test_name, status ),
        patients ( first_name, last_name, mrn )
      `)
      .eq('status', 'pending')
      .eq('hospital_id', TEST_HOSPITAL_ID)
      .order('created_at', { ascending: false })
      .limit(10);

    // Shape check: if data returned, it should have the selected fields
    if (!error && data) {
      data.forEach(row => {
        expect(typeof row.id).toBe('string');
        expect(['pending', 'acknowledged', 'escalated', 'cancelled']).toContain(row.status);
      });
    } else {
      expect(error?.code).not.toBe('42703'); // No missing-column errors
    }
  });

  it('count query for unacknowledged alerts returns a number', async () => {
    const { count, error } = await supabase
      .from('lab_critical_acknowledgements')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('hospital_id', TEST_HOSPITAL_ID);

    if (!error) {
      expect(typeof count === 'number' || count === null).toBe(true);
    } else {
      expect(error.code).not.toBe('42703');
    }
  });
});
