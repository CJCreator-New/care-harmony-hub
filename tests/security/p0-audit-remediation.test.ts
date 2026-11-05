import { describe, it, expect } from 'vitest';
import { checkDrugAllergyConflict } from '@/utils/clinicalValidation';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 0 Audit Remediation Security & Clinical Verification', () => {
  describe('Ticket 01 (SEC-001): phi-crypto Decryption Oracle Hardening', () => {
    const fnSource = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/functions/phi-crypto/index.ts'),
      'utf8'
    );

    it('requires resourceType and resourceId or admin role for decryption', () => {
      expect(fnSource).toContain('resourceType');
      expect(fnSource).toContain('resourceId');
      expect(fnSource).toContain('userClient');
      expect(fnSource).toContain('probeError');
    });

    it('contains comprehensive table mappings for clinical resources', () => {
      expect(fnSource).toContain('clinical_notes');
      expect(fnSource).toContain('prescriptions');
      expect(fnSource).toContain('lab_results');
      expect(fnSource).toContain('patients');
      expect(fnSource).toContain('vitals');
    });

    it('writes audit trail to activity_logs on decryption', () => {
      expect(fnSource).toContain(".from(\"activity_logs\").insert");
      expect(fnSource).toContain("PHI_DECRYPT");
    });
  });

  describe('Ticket 02 (CLIN-001): Drug Allergy Conflict Normalization', () => {
    it('detects penicillin allergy without allergy suffix', () => {
      const res = checkDrugAllergyConflict('Amoxicillin', ['penicillin']);
      expect(res.safe).toBe(false);
      expect(res.hasConflict).toBe(true);
      expect(res.conflictingAllergy).toBe('penicillin');
    });

    it('detects PCN acronym', () => {
      const res = checkDrugAllergyConflict('Piperacillin', ['PCN']);
      expect(res.safe).toBe(false);
      expect(res.hasConflict).toBe(true);
    });

    it('detects sulfa class contraindication', () => {
      const res = checkDrugAllergyConflict('Bactrim', ['sulfa']);
      expect(res.safe).toBe(false);
      expect(res.hasConflict).toBe(true);
    });

    it('passes safe medications without false positives', () => {
      const res = checkDrugAllergyConflict('Metformin', ['penicillin', 'sulfa']);
      expect(res.safe).toBe(true);
      expect(res.hasConflict).toBe(false);
      expect(res.conflicts).toEqual([]);
    });
  });

  describe('Ticket 03 (CLIN-002): Critical Lab Escalation Queue & Worker Routing', () => {
    const labFnSource = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/functions/critical-lab-check/index.ts'),
      'utf8'
    );

    // S0-08 (EDGE-03): the previous assertions here pinned the defects themselves
    // (status "escalated", severity "unverified_review_required", writes to the
    // non-existent critical_lab_alerts table). Behaviour is now covered by
    // tests/critical-lab/*.test.ts; these checks only guard against regressions.
    it('queues the ladder idempotently in lab_alert_escalations', () => {
      expect(labFnSource).toContain('.from("lab_alert_escalations")');
      expect(labFnSource).toContain('onConflict: "alert_id,escalation_level"');
    });

    it('acknowledges on lab_critical_alerts, never the non-existent critical_lab_alerts', () => {
      expect(labFnSource).toContain('request.action === "acknowledge"');
      expect(labFnSource).not.toContain('"critical_lab_alerts"');
      expect(labFnSource).toContain('.is("acknowledged_at", null)');
    });

    it('worker path requires service credentials, checked before any user JWT', () => {
      const workerIdx = labFnSource.indexOf('request.action === "process_escalations"');
      const userAuthIdx = labFnSource.indexOf('getAuthorizedActor(req');
      expect(workerIdx).toBeGreaterThan(-1);
      expect(labFnSource).toContain('isWorkerAuthorized(');
      expect(workerIdx).toBeLessThan(userAuthIdx);
    });

    it('uses only status/severity values allowed by the CHECK constraints', () => {
      expect(labFnSource).not.toContain('"escalated"');
      expect(labFnSource).not.toContain('unverified_review_required');
      expect(labFnSource).not.toContain('processed_at');
    });
  });

  describe('Ticket 04 (SEC-002): Edge Function BOLA Elimination & Actor Scoping', () => {
    const censusSource = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/functions/census-reports/index.ts'),
      'utf8'
    );
    const insuranceSource = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/functions/insurance-integration/index.ts'),
      'utf8'
    );
    const billingSource = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/functions/billing-reconciliation/index.ts'),
      'utf8'
    );
    const stockSource = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/functions/check-low-stock/index.ts'),
      'utf8'
    );
    const queueSource = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/functions/optimize-queue/index.ts'),
      'utf8'
    );
    const deterSource = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/functions/predict-deterioration/index.ts'),
      'utf8'
    );

    it('census-reports enforces getAuthorizedActor and pins hospital_id', () => {
      expect(censusSource).toContain('getAuthorizedActor');
      expect(censusSource).toContain('actor!.hospitalId');
      expect(censusSource).not.toContain('super_admin');
    });

    it('insurance-integration enforces getAuthorizedActor and actor hospital scoping', () => {
      expect(insuranceSource).toContain('getAuthorizedActor');
      expect(insuranceSource).toContain('actor.hospitalId');
    });

    it('billing-reconciliation enforces getAuthorizedActor and pins hospital_id', () => {
      expect(billingSource).toContain('getAuthorizedActor');
      expect(billingSource).toContain('actor!.hospitalId');
    });

    it('check-low-stock pins medication query to actor.hospitalId', () => {
      expect(stockSource).toContain('getAuthorizedActor');
      expect(stockSource).toContain(".eq('hospital_id', actor!.hospitalId)");
    });

    it('optimize-queue enforces getAuthorizedActor and hospital match', () => {
      expect(queueSource).toContain('getAuthorizedActor');
      expect(queueSource).toContain('actor!.hospitalId');
    });

    it('predict-deterioration verifies patient belongs to actor.hospitalId', () => {
      expect(deterSource).toContain('getAuthorizedActor');
      expect(deterSource).toContain(".eq('hospital_id', actor!.hospitalId)");
    });
  });
});
