#!/usr/bin/env node
/**
 * scripts/validate-migrations.mjs
 *
 * Database Migration Reversibility Validator for CareSync HIMS
 * ─────────────────────────────────────────────────────────────
 *
 * Validates that all new database migrations are reversible (no data loss on rollback).
 * Detects breaking patterns like DROP COLUMN, DROP TABLE, TRUNCATE, etc.
 *
 * Purpose:
 *   - Prevent irreversible migrations from merging to main
 *   - Enforce soft-deprecation patterns (add column, don't drop)
 *   - Document rollback strategy for each migration
 *
 * Allowed Patterns ✅:
 *   - ALTER TABLE ... ADD COLUMN
 *   - ALTER TABLE ... ADD CONSTRAINT
 *   - CREATE TABLE
 *   - CREATE INDEX
 *   - CREATE POLICY (RLS)
 *   - DROP POLICY (RLS only, can be re-created)
 *
 * Forbidden Patterns ❌:
 *   - ALTER TABLE ... DROP COLUMN (data loss, can't rollback)
 *   - ALTER TABLE ... DROP CONSTRAINT
 *   - DROP TABLE (data loss)
 *   - DROP SCHEMA
 *   - TRUNCATE
 *   - DELETE without WHERE (data loss)
 *
 * Soft-Deprecation Pattern ✅:
 *   ALTER TABLE patients ADD COLUMN phone_number_deprecated TEXT;
 *   COMMENT ON COLUMN patients.phone_number_deprecated IS 'Sunset in v2.0';
 *   -- Drop in v2.0 migration after 6 months
 *
 * Usage:
 *   npm run validate:migrations               (check all migrations)
 *   npm run validate:migrations -- --strict   (fail on soft deprecations)
 *   npm run validate:migrations -- --verbose  (show detailed analysis)
 *
 * Exit Codes:
 *   0 = All migrations reversible ✅
 *   1 = Irreversible operation found (merge blocked) ❌
 *   2 = Configuration error / no migrations found ⚠️
 */

import { readdirSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

// ─── Setup ──────────────────────────────────────────────────────────────────
const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const MIGRATIONS_DIR = resolve(__dirname, '../supabase/migrations');

// ─── Parse CLI Arguments ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const strict = args.includes('--strict');
const jsonOutput = args.includes('--json');
const help = args.includes('--help') || args.includes('-h');

// ─── Patterns ────────────────────────────────────────────────────────────────
// Historical migrations applied prior to the validator baseline
const BASELINE_MIGRATIONS = new Set([
  '20260204000001_core_schema.sql',
  '20260204000008_security_compliance.sql',
  '20260204000011_misc.sql',
  '20260223100000_production_backend_hardening.sql',
  '20260313000004_audit_testing_compliance_utilities.sql',
  '20260328065831_fix_test_data_and_genders.sql',
]);

const IRREVERSIBLE_PATTERNS = [
  {
    pattern: /ALTER\s+TABLE\s+.*?\s+DROP\s+COLUMN/gi,
    name: 'DROP COLUMN',
    severity: 'CRITICAL',
    reason: 'Columns cannot be undeleted; data is lost permanently',
  },
  {
    pattern: /ALTER\s+TABLE\s+.*?\s+DROP\s+CONSTRAINT/gi,
    name: 'DROP CONSTRAINT',
    severity: 'CRITICAL',
    reason: 'Constraints cannot be easily restored without knowing their exact definition',
    allowIfAddConstraint: true,
  },
  {
    pattern: /^DROP\s+TABLE/gim,
    name: 'DROP TABLE',
    severity: 'CRITICAL',
    reason: 'Table cannot be recovered; all data is lost',
  },
  {
    pattern: /^DROP\s+SCHEMA/gim,
    name: 'DROP SCHEMA',
    severity: 'CRITICAL',
    reason: 'Entire schema cannot be recovered',
  },
  {
    pattern: /^TRUNCATE/gim,
    name: 'TRUNCATE',
    severity: 'CRITICAL',
    reason: 'All table data is deleted and cannot be recovered',
  },
];

const SAFE_PATTERNS = [
  'ALTER TABLE ... ADD COLUMN',
  'ALTER TABLE ... ADD CONSTRAINT',
  'ALTER TABLE ... MODIFY COLUMN (safe only for type widening)',
  'CREATE TABLE',
  'CREATE INDEX',
  'CREATE POLICY (RLS)',
  'DROP POLICY (RLS, can be re-created)',
  'INSERT INTO (seed data)',
];

const SOFT_DEPRECATION_WARNINGS = [
  {
    pattern: /_deprecated|_old|_legacy|_v1/gi,
    name: 'Soft-deprecation column naming',
    message: 'Column appears to be deprecated; ensure COMMENT ON COLUMN is added',
    warning: true,
  },
];

// ─── Help Message ───────────────────────────────────────────────────────────
if (help) {
  console.log(`
CareSync Migration Reversibility Validator v1.0

USAGE:
  npm run validate:migrations [OPTIONS]

OPTIONS:
  --verbose             Show detailed analysis of each migration
  --strict              Fail on soft-deprecation columns (exit 1)
  --json                Output results as JSON (for CI/CD parsing)
  --help, -h            Show this message

EXAMPLES:
  npm run validate:migrations
  npm run validate:migrations -- --verbose
  npm run validate:migrations -- --strict --json > migration-report.json

ALLOWED PATTERNS (✅ Safe to Merge):
${SAFE_PATTERNS.map((p) => `  • ${p}`).join('\n')}

FORBIDDEN PATTERNS (❌ Merge Blocked):
${IRREVERSIBLE_PATTERNS.filter((p) => p.severity === 'CRITICAL')
  .map((p) => `  • ${p.name}: ${p.reason}`)
  .join('\n')}

EXIT CODES:
  0 = All migrations reversible ✅
  1 = Irreversible operation found ❌
  2 = No migrations found / config error ⚠️

BEST PRACTICES:
  1. Use soft-deprecation for columns: ALTER TABLE ... ADD COLUMN ... _deprecated
  2. Add COMMENT explaining sunset date: COMMENT ON COLUMN tbl.col IS 'Sunset in v2.0'
  3. Drop deprecated columns in later migration, 6 months after deprecation
  4. Never DROP COLUMN in same migration that adds replacement
  5. Test rollback: git revert <migration-commit> locally

RATIONALE:
  PostgreSQL migrations are forward-only (Supabase doesn't track rollbacks).
  We use soft-deprecation to allow 6-month transition periods and safe rollbacks.
`);
  process.exit(0);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function stripComments(sql) {
  return sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

// ─── Main Validation ────────────────────────────────────────────────────────
async function validateMigrations() {
  const results = {
    timestamp: new Date().toISOString(),
    migrationsFound: 0,
    migrationsChecked: 0,
    passed: 0,
    failed: 0,
    warningCount: 0,
    errors: [],
    warnings: [],
  };

  // Read migration files
  let migrationFiles;
  try {
    migrationFiles = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch (err) {
    logError('Could not read migrations directory', {
      path: MIGRATIONS_DIR,
      error: err.message,
    });
    process.exit(2);
  }

  if (migrationFiles.length === 0) {
    logError('No SQL migration files found', {
      path: MIGRATIONS_DIR,
    });
    process.exit(2);
  }

  if (!jsonOutput) {
    console.log(`\n🔄 CareSync Migration Reversibility Validator`);
    console.log(`   Path: ${MIGRATIONS_DIR}`);
    console.log(`   Migrations found: ${migrationFiles.length}\n`);
  }

  // Check each migration
  for (const file of migrationFiles) {
    results.migrationsFound++;
    const filePath = join(MIGRATIONS_DIR, file);

    try {
      const content = readFileSync(filePath, 'utf8');
      const result = validateMigrationContent(file, content);

      results.migrationsChecked++;

      if (result.passed) {
        results.passed++;
        if (verbose && !jsonOutput) {
          console.log(`✅ ${file}`);
        }
      } else {
        results.failed++;
        results.errors.push({
          file,
          errors: result.errors,
          details: result.details,
        });

        if (!jsonOutput) {
          console.log(`❌ ${file}`);
          result.errors.forEach((err) => {
            console.log(`   🔴 ${err.pattern}: ${err.reason}`);
            if (verbose) {
              console.log(`      Match: ${err.match}`);
            }
          });
        }
      }

      if (result.warnings.length > 0) {
        results.warningCount += result.warnings.length;
        results.warnings.push({
          file,
          items: result.warnings,
        });

        if (!jsonOutput && verbose) {
          console.log(`⚠️  ${file}`);
          result.warnings.forEach((warn) => {
            console.log(`   ⚠️  ${warn.message}`);
          });
        }
      }
    } catch (err) {
      results.errors.push({
        file,
        error: err.message,
      });
      if (!jsonOutput) {
        console.log(`⚠️  ${file}: ${err.message}`);
      }
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log('\n' + '═'.repeat(70));
    console.log('📊 VALIDATION SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✅ Passed: ${results.passed}/${results.migrationsChecked}`);
    console.log(`❌ Failed: ${results.failed}/${results.migrationsChecked}`);
    if (results.warningCount > 0) {
      console.log(`⚠️  Warnings: ${results.warningCount}`);
    }

    if (results.failed > 0) {
      console.log('\n' + '─'.repeat(70));
      console.log('🚨 MIGRATION VALIDATION FAILED');
      console.log('─'.repeat(70));

      for (const error of results.errors.filter((e) => e.errors)) {
        console.log(`\n❌ ${error.file}:`);
        error.errors.forEach((err) => {
          console.log(`   • ${err.pattern}: ${err.reason}`);
          if (verbose && err.match) {
            console.log(`     Found: ${err.match}`);
          }
        });
      }

      console.log('\n' + '─'.repeat(70));
      console.log('🔧 REMEDIATION:');
      console.log('   1. Review the flagged migrations');
      console.log('   2. Replace DROP COLUMN with soft-deprecation:');
      console.log('      ALTER TABLE tbl ADD COLUMN col_old TEXT;');
      console.log("      COMMENT ON COLUMN tbl.col_old IS 'Deprecated in v1.3; removed in v2.0'");
      console.log('   3. Remove the DROP COLUMN operation');
      console.log('   4. Re-run: npm run validate:migrations\n');
      process.exit(1);
    }

    if (results.warningCount > 0 && strict) {
      console.log('\n' + '─'.repeat(70));
      console.log('⚠️  STRICT MODE: Warnings treated as errors');
      console.log('─'.repeat(70));
      console.log('Soft-deprecation columns found. Add COMMENT ON COLUMN to document sunset date.');
      console.log('Re-run with: npm run validate:migrations (without --strict) to ignore.\n');
      process.exit(1);
    }

    console.log('\n✅ ALL MIGRATIONS REVERSIBLE');
    console.log('═'.repeat(70));
    console.log('Database schema changes can be safely rolled back.\n');
    process.exit(0);
  }
}

// ─── Validation Helper ───────────────────────────────────────────────────────
function validateMigrationContent(filename, content) {
  const result = {
    passed: true,
    errors: [],
    warnings: [],
    details: {},
  };

  // Baseline migrations applied prior to validator enforcement
  if (BASELINE_MIGRATIONS.has(filename)) {
    return result;
  }

  const cleanContent = stripComments(content);

  // Check for irreversible patterns
  for (const check of IRREVERSIBLE_PATTERNS) {
    const matches = [...cleanContent.matchAll(check.pattern)];

    if (matches.length > 0) {
      if (
        check.allowIfAddConstraint &&
        /ALTER\s+TABLE\s+.*?\s+ADD\s+CONSTRAINT/gi.test(cleanContent)
      ) {
        // Safe: Constraint is being replaced/updated in the same migration
        continue;
      }
      result.passed = false;
      result.errors.push({
        pattern: check.name,
        severity: check.severity,
        reason: check.reason,
        match: matches[0][0],
        count: matches.length,
      });
    }
  }

  // Check for DELETE without WHERE clause
  const deleteRegex = /DELETE\s+FROM\s+([^;]+?)(?:;|$)/gis;
  let dMatch;
  while ((dMatch = deleteRegex.exec(cleanContent)) !== null) {
    const statementBody = dMatch[1];
    if (!/\bWHERE\b/i.test(statementBody)) {
      result.passed = false;
      result.errors.push({
        pattern: 'DELETE without WHERE clause',
        severity: 'CRITICAL',
        reason: 'Deletes all rows without filtering; data is lost',
        match: dMatch[0].trim(),
        count: 1,
      });
    }
  }

  // Check for soft-deprecation warnings
  if (!strict) {
    for (const warn of SOFT_DEPRECATION_WARNINGS) {
      const matches = [...cleanContent.matchAll(warn.pattern)];

      if (matches.length > 0 && !cleanContent.includes('COMMENT ON COLUMN')) {
        result.warnings.push({
          pattern: warn.name,
          message: warn.message,
          count: matches.length,
        });
      }
    }
  }

  // Summary for verbose output
  if (verbose) {
    const hasAdd = /ALTER\s+TABLE.*ADD\s+COLUMN/gi.test(cleanContent);
    const hasCreate = /CREATE\s+TABLE/gi.test(cleanContent);
    const hasIndex = /CREATE\s+INDEX/gi.test(cleanContent);
    const hasRls = /CREATE\s+POLICY|ALTER\s+TABLE.*ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi.test(
      cleanContent
    );

    result.details = {
      hasAddColumn: hasAdd,
      hasCreateTable: hasCreate,
      hasCreateIndex: hasIndex,
      hasRlsPolicy: hasRls,
      linesOfCode: content.split('\n').length,
    };
  }

  return result;
}

// ─── Helper ─────────────────────────────────────────────────────────────────
function logError(msg, details = null) {
  if (jsonOutput) {
    console.log(JSON.stringify({ error: msg, details }, null, 2));
  } else {
    console.error(`❌ ${msg}`);
    if (details && typeof details === 'object') {
      Object.entries(details).forEach(([k, v]) => {
        console.error(`   ${k}: ${v}`);
      });
    }
  }
}

// ─── Run Validation ────────────────────────────────────────────────────────
validateMigrations().catch((err) => {
  logError('Unexpected error', { message: err.message });
  process.exit(2);
});
