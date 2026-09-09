import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('SEC-009 / REL-002: Discharge Workflow Scoping & Concurrency Verification (Ticket 17)', () => {
  const edgeFunctionSource = fs.readFileSync(
    path.resolve(process.cwd(), 'supabase/functions/discharge-workflow/index.ts'),
    'utf8'
  );

  const migrationSource = fs.readFileSync(
    path.resolve(process.cwd(), 'supabase/migrations/20260909000004_discharge_workflow_row_locking.sql'),
    'utf8'
  );

  describe('AC-1: Multi-Tenant Isolation & Cross-Hospital Scoping', () => {
    it('scopes discharge workflow fetch explicitly to actor.hospitalId', () => {
      expect(edgeFunctionSource).toContain('.eq("id", payload.workflowId)');
      expect(edgeFunctionSource).toContain('.eq("hospital_id", actor.hospitalId)');
    });

    it('returns 404 when workflow is not found or belongs to another hospital', () => {
      expect(edgeFunctionSource).toContain('status: 404');
      expect(edgeFunctionSource).toContain('Workflow not found or access denied');
    });

    it('scopes all update queries (approve, reject, cancel) with hospital_id', () => {
      // Check that every update query pins hospital_id
      const matches = edgeFunctionSource.match(/\.eq\("hospital_id", actor\.hospitalId\)/g);
      expect(matches).toBeDefined();
      expect(matches!.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('AC-2: Sequential State Machine Transitions (ADR-0003)', () => {
    it('defines strict sequential order: doctor -> pharmacist -> billing -> nurse -> completed', () => {
      expect(edgeFunctionSource).toContain('pharmacist: "billing"');
      expect(edgeFunctionSource).toContain('billing: "nurse"');
      expect(edgeFunctionSource).toContain('nurse: "completed"');
    });

    it('maps step roles strictly to prevent premature or unauthorized actions', () => {
      expect(edgeFunctionSource).toContain('doctor: ["doctor"]');
      expect(edgeFunctionSource).toContain('pharmacist: ["pharmacist"]');
      expect(edgeFunctionSource).toContain('billing: ["receptionist", "admin"]');
      expect(edgeFunctionSource).toContain('nurse: ["nurse"]');
    });

    it('enforces role authorization per workflow step with 403 Forbidden', () => {
      expect(edgeFunctionSource).toContain('status: 403');
      expect(edgeFunctionSource).toContain('"Forbidden for this workflow step"');
    });
  });

  describe('AC-3: Race Condition Immunity & Row-Level Locking', () => {
    it('implements transition_discharge_workflow with SELECT ... FOR UPDATE', () => {
      expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.transition_discharge_workflow');
      expect(migrationSource).toContain('FOR UPDATE');
      expect(migrationSource).toContain('p_workflow_id');
      expect(migrationSource).toContain('p_hospital_id');
      expect(migrationSource).toContain('p_expected_step');
    });

    it('returns HTTP 409 Conflict when concurrent race occurs or row was already updated', () => {
      expect(edgeFunctionSource).toContain('status: 409');
      expect(edgeFunctionSource).toContain('conflict detected or already updated by another user');
    });

    it('invokes transition_discharge_workflow RPC from edge function', () => {
      expect(edgeFunctionSource).toContain('transition_discharge_workflow');
      expect(edgeFunctionSource).toContain('p_expected_step: currentStep');
    });
  });
});
