import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261113000001_adr_0012_0015_flow_optimization.sql'),
  'utf8'
);

describe('ADR flow optimization migration invariants', () => {
  it('claims queue entries atomically and scoped to the caller hospital', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.claim_queue_patient');
    expect(migration).toMatch(/FROM public\.patient_queue[\s\S]*?FOR UPDATE/);
    expect(migration).toContain('QUEUE_ENTRY_ALREADY_CLAIMED');
    expect(migration).toMatch(/WHERE id = p_entry_id AND hospital_id = v_hospital/);
  });

  it('requires an audited rationale before an emergency triage bypass', () => {
    expect(migration).toContain('BYPASS_RATIONALE_REQUIRED');
    expect(migration).toMatch(
      /emergency_bypass = false[\s\S]*?length\(btrim\(bypass_rationale\)\) >= 5/
    );
  });

  it('enforces the nursing release gate in the database', () => {
    expect(migration).toContain('discharge_nurse_release_gate');
    expect(migration).toMatch(
      /current_step <> 'completed'[\s\S]*?doctor_signed AND pharmacy_cleared AND billing_cleared/
    );
    expect(migration).toContain('NURSE_RELEASE_GATE');
  });

  it('keeps Tier-1 portal bookings in pending_confirmation', () => {
    expect(migration).toContain("'pending_confirmation'");
    expect(migration).toContain('appointment_requests_status_check');
  });
});
