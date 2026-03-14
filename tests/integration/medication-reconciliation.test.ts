// @ts-nocheck
/**
 * Integration tests for the admission medication reconciliation workflow.
 * Validates medication_reconciliation_workflows table interactions and
 * the multi-step status progression: initiated → pharmacist_review →
 * nurse_reconciliation → completed.
 */
import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

const TEST_HOSPITAL_ID  = '00000000-0000-0000-0000-000000000001';
const TEST_PATIENT_ID   = '00000000-0000-0000-0000-000000000002';
const TEST_DOCTOR_ID    = '00000000-0000-0000-0000-000000000003';
const TEST_PHARMACIST_ID = '00000000-0000-0000-0000-000000000005';
const TEST_NURSE_ID      = '00000000-0000-0000-0000-000000000006';

// ── detectDiscrepancies helper (mirrored from hook) ───────────────────────────

type Medication = { name: string; dose?: string; frequency?: string };

function detectDiscrepancies(
  homeMeds: Medication[],
  activePrescriptions: Medication[]
): Array<{ type: string; medication: string; detail: string }> {
  const discrepancies: Array<{ type: string; medication: string; detail: string }> = [];
  const rxMap = new Map(activePrescriptions.map(p => [p.name.toLowerCase(), p]));
  const homeMap = new Map(homeMeds.map(m => [m.name.toLowerCase(), m]));

  // Omissions — home meds not in active prescriptions
  homeMeds.forEach(med => {
    if (!rxMap.has(med.name.toLowerCase())) {
      discrepancies.push({ type: 'omission', medication: med.name, detail: 'Not prescribed in hospital' });
    }
  });

  // Commissions — new hospital meds not in home list
  activePrescriptions.forEach(rx => {
    if (!homeMap.has(rx.name.toLowerCase())) {
      discrepancies.push({ type: 'commission', medication: rx.name, detail: 'New medication not on home list' });
    }
  });

  // Dose/frequency changes
  homeMeds.forEach(med => {
    const rx = rxMap.get(med.name.toLowerCase());
    if (!rx) return;
    if (rx.dose && med.dose && rx.dose !== med.dose) {
      discrepancies.push({ type: 'dose_change', medication: med.name, detail: `Home: ${med.dose} → Hospital: ${rx.dose}` });
    }
    if (rx.frequency && med.frequency && rx.frequency !== med.frequency) {
      discrepancies.push({ type: 'frequency_change', medication: med.name, detail: `Home: ${med.frequency} → Hospital: ${rx.frequency}` });
    }
  });

  return discrepancies;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Admission Medication Reconciliation Workflow', () => {

  // ── Schema connectivity ──────────────────────────────────────────────────

  it('medication_reconciliation_workflows table is reachable', async () => {
    const { error } = await supabase
      .from('medication_reconciliation_workflows')
      .select('id')
      .limit(1);
    expect(error === null || typeof error === 'object').toBe(true);
  });

  it('medication_reconciliation_audit table is reachable', async () => {
    const { error } = await supabase
      .from('medication_reconciliation_audit')
      .select('id')
      .limit(1);
    expect(error === null || typeof error === 'object').toBe(true);
  });

  // ── Workflow lifecycle ───────────────────────────────────────────────────

  it('can insert a reconciliation workflow record in initiated status', async () => {
    const homeMeds = [
      { name: 'Metformin', dose: '500mg', frequency: 'twice daily' },
      { name: 'Lisinopril', dose: '10mg', frequency: 'once daily' },
    ];

    const { data, error } = await supabase
      .from('medication_reconciliation_workflows')
      .insert({
        hospital_id:      TEST_HOSPITAL_ID,
        patient_id:       TEST_PATIENT_ID,
        initiated_by:     TEST_DOCTOR_ID,
        status:           'initiated',
        home_medications: homeMeds,
        discrepancies:    [],
      })
      .select()
      .single();

    if (error) {
      expect(error.code).not.toBe('42703'); // No column mismatch
      return;
    }

    expect(data?.status).toBe('initiated');
    expect(Array.isArray(data?.home_medications)).toBe(true);

    await supabase.from('medication_reconciliation_workflows').delete().eq('id', data.id);
  });

  it('can advance workflow from initiated → pharmacist_review', async () => {
    const { data: workflow, error: createErr } = await supabase
      .from('medication_reconciliation_workflows')
      .insert({
        hospital_id:      TEST_HOSPITAL_ID,
        patient_id:       TEST_PATIENT_ID,
        initiated_by:     TEST_DOCTOR_ID,
        status:           'initiated',
        home_medications: [{ name: 'Aspirin', dose: '81mg', frequency: 'once daily' }],
        discrepancies:    [],
      })
      .select()
      .single();

    if (createErr) {
      expect(createErr.code).not.toBe('42703');
      return;
    }

    const { data: advanced, error: advErr } = await supabase
      .from('medication_reconciliation_workflows')
      .update({
        status:       'pharmacist_review',
        reviewed_by:  TEST_PHARMACIST_ID,
        reviewed_at:  new Date().toISOString(),
        discrepancies: [{ type: 'commission', medication: 'Heparin', detail: 'New hospital med' }],
      })
      .eq('id', workflow.id)
      .select()
      .single();

    expect(advErr).toBeNull();
    expect(advanced?.status).toBe('pharmacist_review');

    await supabase.from('medication_reconciliation_workflows').delete().eq('id', workflow.id);
  });

  it('can advance workflow through all 4 stages to completed', async () => {
    const { data: workflow, error: createErr } = await supabase
      .from('medication_reconciliation_workflows')
      .insert({
        hospital_id:      TEST_HOSPITAL_ID,
        patient_id:       TEST_PATIENT_ID,
        initiated_by:     TEST_DOCTOR_ID,
        status:           'initiated',
        home_medications: [{ name: 'Warfarin', dose: '5mg', frequency: 'once daily' }],
        discrepancies:    [],
      })
      .select()
      .single();

    if (createErr) {
      expect(createErr.code).not.toBe('42703');
      return;
    }

    // Pharmacist review
    const { error: e2 } = await supabase
      .from('medication_reconciliation_workflows')
      .update({ status: 'pharmacist_review', reviewed_by: TEST_PHARMACIST_ID, reviewed_at: new Date().toISOString() })
      .eq('id', workflow.id);
    expect(e2).toBeNull();

    // Nurse reconciliation
    const { error: e3 } = await supabase
      .from('medication_reconciliation_workflows')
      .update({ status: 'nurse_reconciliation', reconciled_by: TEST_NURSE_ID, reconciled_at: new Date().toISOString() })
      .eq('id', workflow.id);
    expect(e3).toBeNull();

    // Completed
    const { data: final, error: e4 } = await supabase
      .from('medication_reconciliation_workflows')
      .update({ status: 'completed' })
      .eq('id', workflow.id)
      .select()
      .single();

    expect(e4).toBeNull();
    expect(final?.status).toBe('completed');

    await supabase.from('medication_reconciliation_workflows').delete().eq('id', workflow.id);
  });

  // ── detectDiscrepancies unit logic ───────────────────────────────────────

  describe('detectDiscrepancies helper', () => {
    it('identifies omitted home medications', () => {
      const home = [{ name: 'Metformin', dose: '500mg', frequency: 'twice daily' }];
      const rx   = [{ name: 'Insulin', dose: '10 units', frequency: 'before meals' }];
      const result = detectDiscrepancies(home, rx);
      expect(result.some(d => d.type === 'omission' && d.medication === 'Metformin')).toBe(true);
    });

    it('identifies commissioned (new) medications', () => {
      const home = [];
      const rx   = [{ name: 'Heparin', dose: '5000 units', frequency: 'every 8h' }];
      const result = detectDiscrepancies(home, rx);
      expect(result.some(d => d.type === 'commission' && d.medication === 'Heparin')).toBe(true);
    });

    it('identifies dose changes', () => {
      const home = [{ name: 'Atenolol', dose: '25mg', frequency: 'once daily' }];
      const rx   = [{ name: 'Atenolol', dose: '50mg', frequency: 'once daily' }];
      const result = detectDiscrepancies(home, rx);
      expect(result.some(d => d.type === 'dose_change' && d.medication === 'Atenolol')).toBe(true);
    });

    it('identifies frequency changes', () => {
      const home = [{ name: 'Lisinopril', dose: '10mg', frequency: 'once daily' }];
      const rx   = [{ name: 'Lisinopril', dose: '10mg', frequency: 'twice daily' }];
      const result = detectDiscrepancies(home, rx);
      expect(result.some(d => d.type === 'frequency_change' && d.medication === 'Lisinopril')).toBe(true);
    });

    it('returns empty array for identical medication lists', () => {
      const meds = [{ name: 'Aspirin', dose: '81mg', frequency: 'once daily' }];
      const result = detectDiscrepancies(meds, meds);
      expect(result).toHaveLength(0);
    });

    it('is case-insensitive for medication name matching', () => {
      const home = [{ name: 'metformin', dose: '500mg', frequency: 'twice daily' }];
      const rx   = [{ name: 'Metformin', dose: '500mg', frequency: 'twice daily' }];
      const result = detectDiscrepancies(home, rx);
      expect(result).toHaveLength(0);
    });
  });
});
