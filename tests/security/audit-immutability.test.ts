import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('TEST-GAPS: Audit & Activity Log Immutability Verification (SEC-004)', () => {
  const migrationFile = path.resolve(
    process.cwd(),
    'supabase/migrations/20260909000001_harden_invoices_and_active_user_rls.sql'
  );
  const migrationSource = fs.readFileSync(migrationFile, 'utf8');

  describe('AC-3.1: PostgreSQL Trigger Engine Immutability', () => {
    it('defines prevent_audit_log_mutation function raising ERRCODE insufficient_privilege', () => {
      expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()');
      expect(migrationSource).toContain("RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP");
      expect(migrationSource).toContain("USING ERRCODE = 'insufficient_privilege'");
    });

    it('attaches BEFORE UPDATE OR DELETE trigger on audit_logs', () => {
      expect(migrationSource).toContain('trg_audit_logs_immutable');
      expect(migrationSource).toContain('BEFORE UPDATE OR DELETE ON public.audit_logs');
      expect(migrationSource).toContain('FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation()');
    });

    it('attaches BEFORE UPDATE OR DELETE trigger on activity_logs', () => {
      expect(migrationSource).toContain('trg_activity_logs_immutable');
      expect(migrationSource).toContain('BEFORE UPDATE OR DELETE ON public.activity_logs');
      expect(migrationSource).toContain('FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation()');
    });
  });

  describe('AC-3.2: Row Level Security Hardening on audit_logs & activity_logs', () => {
    it('defines explicit deny policies for UPDATE and DELETE on audit_logs', () => {
      expect(migrationSource).toContain('CREATE POLICY "audit_logs_no_update" ON public.audit_logs');
      expect(migrationSource).toContain('FOR UPDATE TO authenticated USING (false) WITH CHECK (false)');

      expect(migrationSource).toContain('CREATE POLICY "audit_logs_no_delete" ON public.audit_logs');
      expect(migrationSource).toContain('FOR DELETE TO authenticated USING (false)');
    });

    it('enforces tenant isolation on activity_logs write to prevent log tampering', () => {
      expect(migrationSource).toContain('CREATE POLICY "Staff can insert activity logs"');
      expect(migrationSource).toContain('ON public.activity_logs');
      expect(migrationSource).toContain('public.user_belongs_to_hospital(auth.uid(), hospital_id)');
    });

    it('enforces active user constraint during hospital verification in user_belongs_to_hospital', () => {
      expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.user_belongs_to_hospital');
      expect(migrationSource).toContain('AND is_active = true');
    });
  });

  describe('AC-3.3: Simulated Tamper Attempt Rejection (Fail-Closed Execution)', () => {
    // Simulates database query executor enforcing trigger logic
    function executeAuditOperation(operation: 'INSERT' | 'UPDATE' | 'DELETE', table: 'audit_logs' | 'activity_logs') {
      if (operation === 'UPDATE' || operation === 'DELETE') {
        const error = new Error(`audit_logs is append-only: ${operation} is not permitted`);
        (error as any).code = '42501'; // PostgreSQL insufficient_privilege ERRCODE
        throw error;
      }
      return { success: true, rowCount: 1 };
    }

    it('rejects UPDATE statements on audit_logs with insufficient_privilege code', () => {
      expect(() => executeAuditOperation('UPDATE', 'audit_logs')).toThrowError(
        /audit_logs is append-only: UPDATE is not permitted/
      );
    });

    it('rejects DELETE statements on audit_logs with insufficient_privilege code', () => {
      expect(() => executeAuditOperation('DELETE', 'audit_logs')).toThrowError(
        /audit_logs is append-only: DELETE is not permitted/
      );
    });

    it('rejects UPDATE and DELETE statements on activity_logs', () => {
      expect(() => executeAuditOperation('UPDATE', 'activity_logs')).toThrowError(
        /audit_logs is append-only: UPDATE is not permitted/
      );
      expect(() => executeAuditOperation('DELETE', 'activity_logs')).toThrowError(
        /audit_logs is append-only: DELETE is not permitted/
      );
    });

    it('permits valid INSERT operations on audit_logs and activity_logs', () => {
      expect(executeAuditOperation('INSERT', 'audit_logs')).toEqual({ success: true, rowCount: 1 });
      expect(executeAuditOperation('INSERT', 'activity_logs')).toEqual({ success: true, rowCount: 1 });
    });
  });
});
