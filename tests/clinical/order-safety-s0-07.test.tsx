/**
 * S0-07 regression suite: fail-closed CDS on the live prescribing path.
 *
 * Pins the acceptance criteria from docs/repository-audit (CLIN-01, CLIN-02,
 * CLIN-14, CLIN-15 frequency math, CLIN-27 actor derivation) against the
 * order-safety module, the code the prescribing screens now import.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useOrderSafety,
  HeadlessOrderSafetyEngine,
  InMemoryLocalDdiAdapter,
  MockRxNormAdapter,
  SpyAuditLoggerAdapter,
  CDSUnavailableFailClosedError,
  CONTEXT_INCOMPLETE_CODE,
  ALLERGY_STATUS_UNKNOWN_CODE,
  toOrderItems,
  parseDoseMg,
  parseDosesPerDay,
  inferRoute,
  normalizeAllergyList,
  medicationsFromRecord,
  ageFromDateOfBirth,
  findingKey,
  type PatientClinicalContext,
  type OrderItemIntent,
  type IOrderSafetyEngine,
} from '@/modules/order-safety';
import { getDosesPerDay } from '@/modules/order-safety/core/pediatricEngine';

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() } }));

const HOSPITAL = 'hospital-a';
const doctorAuth = {
  user: { id: 'doctor-1', role: 'authenticated' },
  profile: { id: 'p-1', user_id: 'doctor-1', hospital_id: HOSPITAL },
  roles: ['doctor'],
  primaryRole: 'doctor',
};

function engine(): HeadlessOrderSafetyEngine {
  return new HeadlessOrderSafetyEngine({
    localDdiRepo: new InMemoryLocalDdiAdapter(),
    rxNormPort: new MockRxNormAdapter(),
    auditLogger: new SpyAuditLoggerAdapter(),
  });
}

const actor = { userId: 'doctor-1', hospitalId: HOSPITAL, role: 'doctor' as const };
const adult = (over: Partial<PatientClinicalContext> = {}): PatientClinicalContext => ({
  patientId: 'pt-1',
  hospitalId: HOSPITAL,
  ageYears: 40,
  allergies: [],
  activeMedications: [],
  ...over,
});
const item = (drugName: string, dosage = '500 mg', frequency = 'BID'): OrderItemIntent =>
  toOrderItems([{ medication_name: drugName, dosage, frequency }])[0];

// ─── Mapping ──────────────────────────────────────────────────────────────────

describe('S0-07 mapping from application records', () => {
  it('parses dose masses and refuses ambiguous doses', () => {
    expect(parseDoseMg('500mg')).toBe(500);
    expect(parseDoseMg('0.5 g')).toBe(500);
    expect(parseDoseMg('250 mcg')).toBeCloseTo(0.25);
    expect(parseDoseMg('1,000 mg')).toBe(1000);
    expect(Number.isNaN(parseDoseMg('5 ml'))).toBe(true);
    expect(Number.isNaN(parseDoseMg('1-2 tablets'))).toBe(true);
    expect(Number.isNaN(parseDoseMg('250-500 mg'))).toBe(true);
    expect(Number.isNaN(parseDoseMg(''))).toBe(true);
  });

  it('falls back to the dose in the drug name', () => {
    const [i] = toOrderItems([{ medication_name: 'Amoxicillin 500mg', dosage: '1 tab', frequency: 'TID' }]);
    expect(i.doseMg).toBe(500);
    expect(i.dosesPerDay).toBe(3);
    expect(i.route).toBe('PO');
  });

  it('infers a route only when stated, otherwise UNSPECIFIED', () => {
    expect(inferRoute('10 units SC')).toBe('SC');
    expect(inferRoute('1 g IV')).toBe('IV');
    expect(inferRoute('500 mg', 'take by mouth')).toBe('PO');
    expect(inferRoute('10 units')).toBe('UNSPECIFIED');
    expect(inferRoute('IV or PO')).toBe('UNSPECIFIED');
  });

  it('counts doses per day correctly (CLIN-15: q4h = 6, q6h = 4)', () => {
    expect(parseDosesPerDay('q4h')).toBe(6);
    expect(parseDosesPerDay('q6h')).toBe(4);
    expect(parseDosesPerDay('q4-6h')).toBe(6);
    expect(parseDosesPerDay('every 8 hours')).toBe(3);
    expect(parseDosesPerDay('BID')).toBe(2);
    expect(parseDosesPerDay('once daily')).toBe(1);
    expect(parseDosesPerDay('PRN')).toBeUndefined();
    expect(getDosesPerDay('q4h', 1)).toBe(6);
    expect(getDosesPerDay('q6h', 1)).toBe(4);
    expect(getDosesPerDay('q6-8h', 1)).toBe(4);
  });

  it('normalizes allergy fields and distinguishes NKDA from not recorded', () => {
    expect(normalizeAllergyList('Penicillin allergy, sulfa; latex')).toEqual({
      allergies: ['Penicillin allergy', 'sulfa', 'latex'],
      recorded: true,
    });
    expect(normalizeAllergyList(['NKDA'])).toEqual({ allergies: [], recorded: true });
    expect(normalizeAllergyList(null)).toEqual({ allergies: [], recorded: false });
    expect(normalizeAllergyList([])).toEqual({ allergies: [], recorded: false });
  });

  it('reads home medications stored as strings or objects', () => {
    expect(medicationsFromRecord(['Warfarin 5mg', { name: 'Metformin', dosage: '500 mg' }])).toEqual([
      { drugName: 'Warfarin 5mg', dosageMg: 5 },
      { drugName: 'Metformin', dosageMg: 500 },
    ]);
    expect(medicationsFromRecord('aspirin, None reported')).toEqual([{ drugName: 'aspirin' }]);
  });

  it('computes age from date of birth', () => {
    expect(ageFromDateOfBirth('2020-06-15', new Date('2026-06-14T12:00:00Z'))).toEqual({
      ageYears: 5,
      ageMonths: 71,
    });
    expect(ageFromDateOfBirth('not a date')).toBeNull();
  });
});

// ─── Engine behaviour on the live path ────────────────────────────────────────

describe('S0-07 engine: CLIN-01 acceptance', () => {
  it.each(['Penicillin allergy', 'PCN', 'penicillins', 'Allergic to penicillin'])(
    'blocks amoxicillin for documented allergy "%s"',
    async (allergy) => {
      const a = await engine().evaluate({
        actor,
        patient: adult({ allergies: [allergy] }),
        items: [item('Amoxicillin')],
      });
      expect(a.verdict).toBe('REQUIRES_OVERRIDE');
      expect(a.canProceed).toBe(false);
      expect(a.findings.some((f) => f.kind === 'ALLERGY_CROSS_REACTIVITY' && f.requiresPhysicianOverride)).toBe(true);
    }
  );

  it('flags a new NSAID against a home anticoagulant', async () => {
    const a = await engine().evaluate({
      actor,
      patient: adult({ activeMedications: [{ drugName: 'Warfarin 5mg' }] }),
      items: [item('Ibuprofen', '400 mg', 'TID')],
    });
    expect(a.canProceed).toBe(false);
    expect(a.findings.some((f) => f.kind === 'DRUG_DRUG_INTERACTION' && /warfarin/i.test(f.interactingSubject || ''))).toBe(true);
  });

  it('fails closed when patient data is incomplete, and clears only with a documented override', async () => {
    const e = engine();
    const patient = adult({ dataGaps: ['existing prescriptions could not be loaded'] });
    const items = [item('Paracetamol')];
    const a = await e.evaluate({ actor, patient, items });
    expect(a.verdict).toBe('INCOMPLETE_CDS');
    expect(a.findings.map((f) => f.code)).toContain(CONTEXT_INCOMPLETE_CODE);

    await expect(e.clear({ actor, patient, items, action: 'DOCTOR_PRESCRIBE' })).rejects.toBeInstanceOf(
      CDSUnavailableFailClosedError
    );
    const receipt = await e.clear({
      actor,
      patient,
      items,
      action: 'DOCTOR_PRESCRIBE',
      overrides: [
        { findingCode: CONTEXT_INCOMPLETE_CODE, overrideReason: 'Allergies and meds verified verbally with patient', authorizedDoctorId: 'doctor-1' },
      ],
    });
    expect(receipt.status).toBe('CLEARED');
    expect(receipt.receiptId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reports unknown allergy status without blocking', async () => {
    const a = await engine().evaluate({ actor, patient: adult({ allergyStatusUnknown: true }), items: [item('Paracetamol')] });
    expect(a.canProceed).toBe(true);
    expect(a.findings.find((f) => f.code === ALLERGY_STATUS_UNKNOWN_CODE)?.requiresPhysicianOverride).toBe(false);
  });

  it('never clears a pediatric weight-based order without weight or a readable dose', async () => {
    const child = adult({ ageYears: 4, ageMonths: 50 });
    const noWeight = await engine().evaluate({ actor, patient: child, items: [item('Amoxicillin', '250 mg', 'TID')] });
    expect(noWeight.findings.some((f) => f.code.startsWith('PEDIATRIC_WEIGHT_UNAVAILABLE_'))).toBe(true);
    expect(noWeight.canProceed).toBe(false);

    const badDose = await engine().evaluate({
      actor,
      patient: { ...child, weightKg: 16 },
      items: [item('Amoxicillin', '5 ml', 'TID')],
    });
    expect(badDose.findings.some((f) => f.code.startsWith('PEDIATRIC_DOSE_UNVERIFIED_'))).toBe(true);
  });

  it('does not guess a route: unspecified insulin is not flagged, PO insulin is', async () => {
    const unspecified = await engine().evaluate({ actor, patient: adult(), items: [item('Insulin glargine', '10 units', 'once daily')] });
    expect(unspecified.findings.some((f) => f.kind === 'ROUTE_INCOMPATIBILITY')).toBe(false);
    const oral = await engine().evaluate({ actor, patient: adult(), items: [item('Insulin glargine', '10 units PO', 'once daily')] });
    expect(oral.findings.some((f) => f.kind === 'ROUTE_INCOMPATIBILITY')).toBe(true);
  });

  it('gives the same clinical issue the same key on prescriber and pharmacist screens', async () => {
    const patient = adult({ allergies: ['PCN'] });
    const prescriber = await engine().evaluate({ actor, patient, items: toOrderItems([{ medication_name: 'Amoxicillin', dosage: '500 mg' }], 'rx') });
    const pharmacist = await engine().evaluate({ actor, patient, items: toOrderItems([{ id: 'db-item-9', medication_name: 'Amoxicillin', dosage: '500 mg' }]) });
    const k1 = prescriber.findings.map(findingKey);
    const k2 = pharmacist.findings.map(findingKey);
    expect(k1.length).toBeGreaterThan(0);
    expect(k1).toEqual(k2);
    expect(prescriber.findings[0].code).not.toEqual(pharmacist.findings[0].code);
  });
});

// ─── Hook: actor, fail-closed and re-evaluation ───────────────────────────────

describe('S0-07 useOrderSafety', () => {
  // One engine per test: consumers must pass a stable engine instance.
  let eng: HeadlessOrderSafetyEngine;
  beforeEach(() => {
    mockUseAuth.mockReturnValue(doctorAuth);
    eng = engine();
  });

  it('enforces tenant isolation using the profile hospital (not the patient\'s)', async () => {
    const { result } = renderHook(() =>
      useOrderSafety({ patient: adult({ hospitalId: 'hospital-b' }), items: [item('Paracetamol')], debounceMs: 5, engine: eng })
    );
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.canProceed).toBe(false);
    expect(result.current.errorMessage).toMatch(/Cross-hospital/);
  });

  it('accepts a doctor override at clearance (role from roles, not user.role)', async () => {
    const { result } = renderHook(() =>
      useOrderSafety({ patient: adult({ allergies: ['PCN'] }), items: [item('Amoxicillin')], debounceMs: 5, engine: eng, actingRole: 'doctor' })
    );
    await waitFor(() => expect(result.current.unhandledOverrides.length).toBe(1));
    act(() => {
      result.current.recordOverride(result.current.unhandledOverrides[0].code, 'Tolerated amoxicillin in 2024 without reaction');
    });
    await waitFor(() => expect(result.current.canProceed).toBe(true));
    const receipt = await result.current.clearAndSign('DOCTOR_PRESCRIBE');
    expect(receipt.clearedBy.role).toBe('doctor');
    expect(receipt.overridesApplied).toHaveLength(1);
  });

  it('re-evaluates when patient allergies arrive after the first check', async () => {
    const items = [item('Amoxicillin')];
    const { result, rerender } = renderHook(({ patient }) => useOrderSafety({ patient, items, debounceMs: 5, engine: eng }), {
      initialProps: { patient: adult() },
    });
    await waitFor(() => expect(result.current.canProceed).toBe(true));
    rerender({ patient: adult({ allergies: ['Penicillin allergy'] }) });
    await waitFor(() => expect(result.current.unhandledOverrides.length).toBe(1));
    expect(result.current.canProceed).toBe(false);
  });

  it('drops an earlier "cleared" result when a later evaluation fails', async () => {
    const real = eng;
    let fail = false;
    const flaky: IOrderSafetyEngine = {
      evaluate: (req) => (fail ? Promise.reject(new Error('engine down')) : real.evaluate(req)),
      clear: (cmd) => real.clear(cmd),
    };
    const { result, rerender } = renderHook(({ items }) => useOrderSafety({ patient: adult(), items, debounceMs: 5, engine: flaky }), {
      initialProps: { items: [item('Paracetamol')] },
    });
    await waitFor(() => expect(result.current.canProceed).toBe(true));
    fail = true;
    rerender({ items: [item('Paracetamol'), item('Omeprazole', '20 mg', 'once daily')] });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.canProceed).toBe(false);
    expect(result.current.findings).toHaveLength(0);
  });

  it('blocks while patient data is loading or unavailable', async () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useOrderSafety({ patient: null, items: [item('Paracetamol')], debounceMs: 5, engine: eng, isContextLoading: loading, contextError: loading ? null : 'Patient safety data could not be loaded.' }),
      { initialProps: { loading: true } }
    );
    expect(result.current.status).toBe('checking');
    expect(result.current.canProceed).toBe(false);
    rerender({ loading: false });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.canProceed).toBe(false);
    await expect(result.current.clearAndSign()).rejects.toThrow(/could not be loaded/);
  });

  it('allows proceeding with no order items', () => {
    const { result } = renderHook(() => useOrderSafety({ patient: null, items: [], engine: eng }));
    expect(result.current.canProceed).toBe(true);
  });
});
