import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 1 Audit Remediation Security, RLS & 2FA Verification', () => {
  const migrationSource = fs.readFileSync(
    path.resolve(process.cwd(), 'supabase/migrations/20260909000001_harden_invoices_and_active_user_rls.sql'),
    'utf8'
  );

  describe('Ticket 05 (RBAC-002): Invoices RLS Billing Boundary', () => {
    it('restricts invoices_hospital_billing_read to admin and receptionist only', () => {
      expect(migrationSource).toContain('"invoices_hospital_billing_read"');
      expect(migrationSource).toContain("ur.role IN ('admin', 'receptionist')");
      
      const invoicePolicyChunk = migrationSource.split('CREATE POLICY "invoices_hospital_billing_read"')[1]?.split(';')[0];
      expect(invoicePolicyChunk).toBeDefined();
      expect(invoicePolicyChunk).not.toContain("'doctor'");
      expect(invoicePolicyChunk).not.toContain("'nurse'");
      expect(invoicePolicyChunk).not.toContain("'super_admin'");
    });
  });

  describe('Ticket 06 (SEC-008): Active User Verification in user_belongs_to_hospital', () => {
    it('enforces profiles.is_active = true in user_belongs_to_hospital', () => {
      expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.user_belongs_to_hospital');
      expect(migrationSource).toContain('AND is_active = true');
    });
  });

  describe('Ticket 07 (SEC-004): Tamper-Proof Audit Trail & Activity Log Scoping', () => {
    it('attaches prevent_audit_log_mutation triggers to audit_logs and activity_logs', () => {
      expect(migrationSource).toContain('CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()');
      expect(migrationSource).toContain('trg_audit_logs_immutable');
      expect(migrationSource).toContain('trg_activity_logs_immutable');
      expect(migrationSource).toContain('BEFORE UPDATE OR DELETE ON public.activity_logs');
    });

    it('enforces hospital scoping on activity_logs write to prevent cross-hospital injection', () => {
      expect(migrationSource).toContain('CREATE POLICY "Staff can insert activity logs"');
      expect(migrationSource).toContain('public.user_belongs_to_hospital(auth.uid(), hospital_id)');
    });

    it('creates audit_logs schema with RLS for ABAC and clinical checks', () => {
      expect(migrationSource).toContain('CREATE TABLE IF NOT EXISTS public.audit_logs');
      expect(migrationSource).toContain('ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY');
    });
  });

  describe('Ticket 08 (SEC-003): Secure 2FA Secret & Code Generation', () => {
    const hookSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/hooks/useTwoFactorAuth.ts'),
      'utf8'
    );

    it('uses window.crypto.getRandomValues for secrets and backup codes', () => {
      expect(hookSource).toContain('window.crypto.getRandomValues');
      expect(hookSource).not.toContain('Math.random()');
    });

    it('verifies TOTP codes via verify-totp edge function before enabling', () => {
      expect(hookSource).toContain("supabase.functions.invoke('verify-totp'");
      expect(hookSource).toContain("supabase.functions.invoke('store-2fa-secret'");
    });

    it('rolls back staged secret on verification failure', () => {
      expect(hookSource).toContain(".from('two_factor_secrets')");
      expect(hookSource).toContain('.delete()');
    });
  });

  describe('Ticket 09 (RBAC-004): Purge Undefined super_admin Role References', () => {
    it('enforces 7 canonical roles constraint on user_roles in migration', () => {
      expect(migrationSource).toContain('chk_canonical_roles');
      expect(migrationSource).toContain(
        "CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'))"
      );
    });

    it('remaps legacy super_admin roles to admin in migration', () => {
      expect(migrationSource).toContain("UPDATE public.user_roles SET role = 'admin' WHERE role = 'super_admin'");
    });
  });

  describe('Ticket 10 (SEC-005): Scope Low Stock Medications to Actor Tenant', () => {
    const stockFnSource = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/functions/check-low-stock/index.ts'),
      'utf8'
    );

    it('pins low stock medication queries to actor.hospitalId', () => {
      expect(stockFnSource).toContain('getAuthorizedActor');
      expect(stockFnSource).toContain(".eq('hospital_id', actor!.hospitalId)");
    });
  });
});
