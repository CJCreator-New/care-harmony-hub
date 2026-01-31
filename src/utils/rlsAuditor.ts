import { supabase } from '@/lib/supabase';

export interface RLSPolicy {
  table_name: string;
  policy_name: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  using_clause: string;
  with_check_clause?: string;
  is_permissive: boolean;
}

export interface RLSAuditResult {
  table_name: string;
  has_rls_enabled: boolean;
  policies: RLSPolicy[];
  issues: string[];
  compliance_score: number;
}

class RLSAuditor {
  private static instance: RLSAuditor;

  private constructor() {}

  static getInstance(): RLSAuditor {
    if (!RLSAuditor.instance) {
      RLSAuditor.instance = new RLSAuditor();
    }
    return RLSAuditor.instance;
  }

  async auditTable(tableName: string): Promise<RLSAuditResult> {
    const [rlsEnabled, policies] = await Promise.all([
      this.checkRLSEnabled(tableName),
      this.getPolicies(tableName),
    ]);

    const issues = this.identifyIssues(tableName, rlsEnabled, policies);
    const complianceScore = this.calculateScore(rlsEnabled, policies, issues);

    return {
      table_name: tableName,
      has_rls_enabled: rlsEnabled,
      policies,
      issues,
      compliance_score: complianceScore,
    };
  }

  async auditAllTables(): Promise<RLSAuditResult[]> {
    const { data: tables, error } = await supabase.rpc('get_all_tables');

    if (error || !tables) {
      console.error('Failed to fetch tables:', error);
      return [];
    }

    const results = await Promise.all(
      tables.map((table: Record<string, unknown>) => this.auditTable(table.table_name as string))
    );

    return results;
  }

  private async checkRLSEnabled(tableName: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_rls_enabled', {
      table_name: tableName,
    });

    return !error && data === true;
  }

  private async getPolicies(tableName: string): Promise<RLSPolicy[]> {
    const { data, error } = await supabase
      .from('information_schema.table_privileges')
      .select('*')
      .eq('table_name', tableName);

    if (error || !data) return [];

    return data.map((policy: Record<string, unknown>) => ({
      table_name: tableName,
      policy_name: (policy.policy_name as string) || 'unknown',
      operation: (policy.operation as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE') || 'SELECT',
      using_clause: (policy.using_clause as string) || '',
      with_check_clause: (policy.with_check_clause as string) || undefined,
      is_permissive: (policy.is_permissive as boolean) ?? true,
    }));
  }

  private identifyIssues(tableName: string, rlsEnabled: boolean, policies: RLSPolicy[]): string[] {
    const issues: string[] = [];

    if (!rlsEnabled) {
      issues.push(`RLS not enabled on table ${tableName}`);
    }

    if (policies.length === 0 && rlsEnabled) {
      issues.push(`No policies defined for table ${tableName}`);
    }

    policies.forEach((policy) => {
      if (policy.using_clause === 'true' && policy.operation !== 'SELECT') {
        issues.push(`Overly permissive policy on ${tableName}: ${policy.policy_name} uses USING (true)`);
      }

      if (!policy.with_check_clause && policy.operation === 'INSERT') {
        issues.push(`INSERT policy on ${tableName} missing WITH CHECK clause`);
      }

      if (!policy.using_clause && policy.operation === 'SELECT') {
        issues.push(`SELECT policy on ${tableName} missing USING clause`);
      }
    });

    return issues;
  }

  private calculateScore(rlsEnabled: boolean, policies: RLSPolicy[], issues: string[]): number {
    let score = 100;

    if (!rlsEnabled) score -= 50;
    if (policies.length === 0) score -= 30;
    score -= issues.length * 5;

    return Math.max(0, score);
  }

  async generateComplianceReport(hospitalId: string): Promise<Record<string, unknown>> {
    const results = await this.auditAllTables();

    const summary = {
      total_tables: results.length,
      rls_enabled: results.filter((r) => r.has_rls_enabled).length,
      compliant_tables: results.filter((r) => r.compliance_score === 100).length,
      issues_found: results.flatMap((r) => r.issues).length,
      average_compliance: Math.round(results.reduce((sum, r) => sum + r.compliance_score, 0) / results.length),
      tables_needing_attention: results.filter((r) => r.compliance_score < 100).map((r) => ({
        table: r.table_name,
        score: r.compliance_score,
        issues: r.issues,
      })),
    };

    return summary;
  }
}

export const rlsAuditor = RLSAuditor.getInstance();
