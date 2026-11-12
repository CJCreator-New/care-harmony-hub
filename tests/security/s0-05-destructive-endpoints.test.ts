/**
 * Roadmap S0-05: remove or neutralize destructive and data-exfiltrating endpoints.
 * Source-level regression guards. Each block fails if the removed or hardened
 * behaviour comes back.
 *
 *   EDGE-02  backup-manager: cross-tenant dump / platform-wide restore (retired, 410)
 *   DB-04    purge_old_audit_logs_staging_only + test_setup_* RPCs (dropped)
 *   FUNC-10  Admin "Test Data" seed/cleanup that deleted real hospital data (removed)
 *   EDGE-01  fhir-integration: user_metadata SMART scopes, system/* bypass,
 *            unscoped bundle exports (hardened)
 *   DB-11    migrations that UPDATE/DELETE PHI (neutralized; new ones need review)
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.(t|j)sx?$/.test(name) ? [p] : [];
  });
}

const srcFiles = sourceFiles(join(root, 'src'));
const srcOffenders = (re: RegExp) => srcFiles.filter((f) => re.test(readFileSync(f, 'utf8')));

/** Strip SQL comments and dollar-quoted bodies (function bodies, DO blocks). */
function topLevelSql(sql: string): string {
  return sql
    .replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
}

function migrationFiles(dir: string): string[] {
  const abs = join(root, dir);
  return readdirSync(abs)
    .filter((n) => /^\d+_.*\.sql$/.test(n))
    .sort()
    .map((n) => join(dir, n));
}

describe('EDGE-02: backup-manager is retired', () => {
  const fn = read('supabase/functions/backup-manager/index.ts');

  it('answers 410 through the shared retired-function response', () => {
    expect(fn).toMatch(/retiredFunctionResponse\(\s*req,\s*"backup-manager"/);
  });

  it('has no service-role client, table access, storage access or delete', () => {
    expect(fn).not.toMatch(/SERVICE_ROLE_KEY|createClient|\.from\(|\.storage|\.delete\(|\.insert\(/);
  });

  it('has no client caller or admin UI', () => {
    expect(srcOffenders(/['"]backup-manager['"]/)).toEqual([]);
    expect(srcOffenders(/useBackupManager|BackupRecoveryDashboard/)).toEqual([]);
    expect(existsSync(join(root, 'src/hooks/useBackupManager.ts'))).toBe(false);
    expect(existsSync(join(root, 'src/components/admin/BackupRecoveryDashboard.tsx'))).toBe(false);
  });
});

describe('DB-04: audit purge and test-fixture RPCs are gone', () => {
  const names = [
    'purge_old_audit_logs_staging_only',
    'test_setup_prescription_audit_scenario',
    'test_setup_invoice_audit_scenario',
  ];

  it('no migration (applied or pending) creates them', () => {
    const files = [
      ...migrationFiles('supabase/migrations'),
      ...migrationFiles('supabase/pending-migrations'),
    ];
    const offenders = files.filter((f) => {
      const sql = read(f).replace(/--[^\n]*/g, ' ');
      return names.some((n) => new RegExp(`CREATE\\s+(OR\\s+REPLACE\\s+)?FUNCTION\\s+(public\\.)?${n}\\b`, 'i').test(sql));
    });
    expect(offenders).toEqual([]);
  });

  it('the pending migration revokes and drops every overload, then verifies', () => {
    const sql = read('supabase/pending-migrations/20261105000005_neutralize_destructive_endpoints.sql');
    for (const n of names) expect(sql).toContain(`'${n}'`);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION %s FROM PUBLIC/);
    expect(sql).toMatch(/DROP FUNCTION %s/);
    expect(sql).toMatch(/RAISE EXCEPTION 'S0-05:/);
  });

  it('nothing in the app calls them', () => {
    expect(srcOffenders(new RegExp(names.join('|')))).toEqual([]);
  });
});

describe('FUNC-10: no test-data seed or cleanup in the application', () => {
  it('has no seeder module, card or cleanup call', () => {
    expect(existsSync(join(root, 'src/utils/testDataSeeder.ts'))).toBe(false);
    expect(existsSync(join(root, 'src/components/admin/TestDataSeederCard.tsx'))).toBe(false);
    expect(srcOffenders(/TestDataSeeder|testDataSeeder|cleanupTestData|seedTestData/)).toEqual([]);
  });

  it('the admin dashboard has no "Test Data" tab', () => {
    const dash = read('src/components/dashboard/AdminDashboard.tsx');
    expect(dash).not.toMatch(/value="testing"|Test Data/);
  });
});

describe('EDGE-01: fhir-integration is confined to the caller hospital', () => {
  const fn = read('supabase/functions/fhir-integration/index.ts');
  const body = (name: string) => {
    const start = fn.search(new RegExp(`\\n(async )?function ${name}\\(`));
    expect(start, `${name} exists`).toBeGreaterThan(-1);
    const rest = fn.slice(start + 1);
    const next = rest.search(/\n(async )?function |\nserve\(|\nconst handler/);
    const end = next > -1 ? start + 1 + next : fn.length;
    return fn.slice(start, end);
  };

  it('never reads SMART scopes from user_metadata or raw JWT claims', () => {
    expect(fn).not.toMatch(/user_metadata\?*\.(scope|scopes|smart_scope|smart_scopes)/);
    expect(fn).not.toMatch(/jwtPayload|decodeJwtPayload/);
  });

  it('has no system-scope bypass of the hospital check', () => {
    expect(fn).not.toMatch(/systemScoped/);
    expect(body('evaluateSmartScopeGrant')).toMatch(/parsed\.context === "system"\) continue;/);
  });

  it.each([
    ['exportPatientToFHIR', 'enforceHospitalAccess('],
    ['importPatientFromFHIR', 'callerHospitalId'],
    ['syncObservations', 'enforceHospitalAccess('],
    ['exportEncounter', 'enforceHospitalAccess('],
    ['exportMedicationRequests', 'loadPatientInCallerHospital('],
    ['exportConditions', 'loadPatientInCallerHospital('],
    ['exportDiagnosticReports', 'loadPatientInCallerHospital('],
  ])('%s enforces the caller hospital', (name, marker) => {
    expect(body(name)).toContain(marker);
  });

  it.each([
    ['exportMedicationRequests', 'prescriptions'],
    ['exportConditions', 'consultations'],
    ['exportDiagnosticReports', 'lab_results'],
  ])('%s filters %s by hospital_id', (name, table) => {
    const b = body(name);
    expect(b).toContain(`.from("${table}")`);
    expect(b).toContain('.eq("hospital_id", patient.hospital_id)');
  });

  it('loadPatientInCallerHospital enforces both hospital and patient scope', () => {
    const b = body('loadPatientInCallerHospital');
    expect(b).toContain('enforceHospitalAccess(');
    expect(b).toContain('enforcePatientScopeAccess(');
  });
});

describe('DB-11: migrations do not mutate or delete PHI without review', () => {
  // Tables holding patient, clinical, financial, identity or audit data.
  const PHI_TABLES = new Set([
    'patients', 'patient_queue', 'patient_consents', 'consents', 'appointments',
    'consultations', 'prescriptions', 'prescription_items', 'medications',
    'lab_orders', 'lab_results', 'lab_samples', 'medical_records', 'vital_signs',
    'clinical_notes', 'documents', 'patient_documents', 'invoices', 'invoice_items',
    'payments', 'insurance_claims', 'messages', 'profiles', 'user_roles',
    'audit_log', 'audit_logs', 'activity_logs', 'prescription_audit',
    'invoice_adjustment_audit', 'lab_result_audit', 'triage_assessments',
    'discharge_workflows', 'care_plans', 'shift_handovers',
  ]);

  // Reviewed in S0-05: non-destructive backfills of derived or new columns.
  // Adding an entry here IS the sign-off; justify it in the PR.
  const REVIEWED: Record<string, string[]> = {
    // clearance_level default (NOTE: also sets is_active = true for rows with a
    // NULL clearance_level, see the S0-05 report), appointment_date and nurse_id backfills.
    '20260204000011_misc.sql': ['UPDATE profiles', 'UPDATE appointments', 'UPDATE vital_signs'],
    '20260311000004_hipaa_encryption_metadata.sql': ['UPDATE vital_signs'],
    '20260622000001_enforce_2fa_for_clinical_roles.sql': ['UPDATE profiles'],
    '20260622000002_prescription_items_hospital_id.sql': ['UPDATE prescription_items'],
    '20260622000004_audit_logs_hospital_id_not_null.sql': ['UPDATE audit_logs'],
  };

  const DML = /(?:^|;|\))\s*(UPDATE\s+(?:ONLY\s+)?|DELETE\s+FROM\s+(?:ONLY\s+)?|TRUNCATE\s+(?:TABLE\s+)?)(?:"?public"?\.)?"?([a-z_]+)"?/gi;

  const files = [...migrationFiles('supabase/migrations'), ...migrationFiles('supabase/pending-migrations')];

  it('finds the migrations to scan', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('only reviewed UPDATEs, and no DELETE/TRUNCATE, touch PHI tables', () => {
    const unreviewed: string[] = [];
    for (const f of files) {
      const name = f.split('/').pop()!;
      const allowed = new Set(REVIEWED[name] ?? []);
      for (const m of topLevelSql(read(f)).matchAll(DML)) {
        const verb = m[1].trim().split(/\s+/)[0].toUpperCase();
        const table = m[2].toLowerCase();
        if (!PHI_TABLES.has(table)) continue;
        const key = `${verb} ${table}`;
        if (verb === 'UPDATE' && allowed.has(key)) continue;
        unreviewed.push(`${name}: ${key}`);
      }
    }
    expect(unreviewed).toEqual([]);
  });

  it('the DB-11 data fixes are no-ops', () => {
    for (const f of [
      'supabase/migrations/20260328065831_fix_test_data_and_genders.sql',
      'supabase/migrations/20260221000001_normalize_mrn_format.sql',
    ]) {
      const sql = topLevelSql(read(f));
      expect(sql).not.toMatch(/\b(UPDATE|DELETE|TRUNCATE|INSERT)\b/i);
    }
    expect(topLevelSql(read('supabase/migrations/20260204000001_core_schema.sql'))).not.toMatch(
      /DELETE\s+FROM\s+public\.consultations/i,
    );
  });

  it('the scanner itself catches the patterns DB-11 reported', () => {
    const sample = topLevelSql(`
      -- comment: DELETE FROM patients
      CREATE FUNCTION f() RETURNS void AS $$ BEGIN DELETE FROM patients; END $$ LANGUAGE plpgsql;
      UPDATE patients SET gender = 'female' WHERE first_name IN ('Jane');
      WITH d AS (SELECT 1) DELETE FROM public.consultations WHERE id IN (SELECT 1);
      CREATE POLICY "Users can update their own" ON profiles FOR UPDATE USING (true);
    `);
    const hits = [...sample.matchAll(DML)].map((m) => `${m[1].trim().split(/\s+/)[0]} ${m[2]}`);
    expect(hits).toEqual(['UPDATE patients', 'DELETE consultations']);
  });
});
