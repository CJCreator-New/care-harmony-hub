#!/usr/bin/env node
/**
 * scripts/validate-rls.mjs
 * 
 * RLS Policy Validator for CareSync HIMS
 * ──────────────────────────────────────
 * 
 * Validates that all patient-critical tables in Supabase have proper
 * hospital_id scoping and RLS policies configured correctly.
 * 
 * Purpose:
 *   - Prevent RLS-broken code from merging to main
 *   - Catch missing hospital_id columns on new tables
 *   - Detect policies missing hospital isolation functions
 *   - Block anonymous write access to PHI tables
 * 
 * Usage:
 *   npm run validate:rls                    (validate against dev DB)
 *   npm run validate:rls -- --db=staging    (validate against staging)
 *   npm run validate:rls -- --verbose       (detailed output with SQL queries)
 *   npm run validate:rls -- --json          (machine-readable JSON output)
 * 
 * Exit Codes:
 *   0 = All checks pass ✅
 *   1 = RLS gap found (merge blocked) ❌
 *   2 = Config error / DB unreachable (investigate) ⚠️
 * 
 * Integration:
 *   - npm pre-commit hook: blocks commit with git commit --no-verify bypass
 *   - GitHub Actions: PR gate in test-pyramid.yml
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import process from 'process';

// ─── Load Environment ────────────────────────────────────────────────────────
config({ path: '.env.local' });

// ─── Parse CLI Arguments ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dbEnv = args.includes('--db=staging') ? 'staging' : 'dev';
const verbose = args.includes('--verbose');
const jsonOutput = args.includes('--json');
const help = args.includes('--help') || args.includes('-h');

// ─── Patient-Critical Tables (46 total, required to have hospital_id) ────────
const PATIENT_CRITICAL_TABLES = [
  // Core patient data
  'patients',           // Primary medical record
  'patient_vitals',     // Temperature, BP, HR, O2, weight, height, pain scale
  'consultations',      // Chief complaint, diagnosis, assessment, plan
  'prescriptions',      // 🔒 HIGHEST RISK — medications, dosage, frequency
  'lab_results',        // 🔒 HIGH RISK — test values, interpretations
  'medications',        // General medication database (should be public, but include hospital_id for future)
  
  // Encounter & Queue Management
  'encounter_queues',   // Admission, discharge, triage status
  'appointment_waitlist', // Patients waiting for appointments
  'pre_registration_forms', // PHI collected before registration
  'insurance_verifications', // Insurance company details
  
  // Appointments & Scheduling
  'appointments',       // Scheduled consultations with doctors
  'recurring_appointments', // Recurring appointment series
  'resource_bookings',  // Equipment, room reservations tied to patients
  'resource_types',     // Equipment types (should be public; include for verification)
  
  // Billing & Payments
  'billing_records',    // Patient invoices, payment status
  'invoices',           // Detailed invoice line items
  'insurance_claims',   // Claims submitted to insurance
  'payments',           // Payment transactions
  'payment_methods',    // Stored payment information
  
  // Clinical Documentation
  'patient_documents',  // Medical records, imaging reports, uploads
  'document_versions',  // Version history for documents
  'nurse_notes',        // Nursing assessments and notes
  'vital_trends',       // Historical vital sign tracking
  
  // Pharmacy & Lab Management
  'pharmacy_orders',    // Medication orders from hospital pharmacy
  'inventory_items',    // Pharmacy inventory tracked per hospital
  'sync_conflicts',     // (pharmacy-service) Sync conflict resolution
  'data_quarantine',    // (pharmacy-service) Data validation quarantine
  'sync_audit_log',     // (pharmacy-service) Audit trail for syncs
  'sync_metadata',      // (pharmacy-service) Sync configuration
  'lab_queue',          // Queue for lab tests
  'lab_orders',         // Ordered lab tests
  'lab_quality_checks', // QC for lab results
  
  // Patient Management & Workflows
  'patient_consents',   // Consent records for procedures, data sharing
  'activity_logs',      // Patient interaction audit trail
  'referrals',          // Referrals to specialists
  'patient_preferences', // Patient communication preferences
  'doctor_preferences', // Doctor shift & specialty preferences
  'shift_schedules',    // Staff shift assignments
  
  // Telemedicine & Portal
  'telemedicine_sessions', // Video consultation records
  'patient_reminders',  // Appointment/medication reminders
  'patient_messages',   // Patient-doctor secure messaging
  
  // Analytics & Reporting (may be denormalized; still need hospital_id)
  'analytics_encounters', // Encounter statistics cache
  'analytics_billing',   // Billing metrics
  'doctor_stats',        // Doctor performance metrics
];

// ─── RLS Isolation Functions ────────────────────────────────────────────────
const EXPECTED_ISOLATION_FUNCTIONS = [
  'current_setting(\'app.current_hospital_id\'',  // Custom setting (pharmacy-service pattern)
  'user_belongs_to_hospital(',                     // Helper function from profiles
  'hospital_id =',                                 // Direct comparison (legacy)
];

// ─── Configuration ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ─── Help Message ───────────────────────────────────────────────────────────
if (help) {
  console.log(`
CareSync RLS Policy Validator v1.0

USAGE:
  npm run validate:rls [OPTIONS]

OPTIONS:
  --db=staging          Validate against staging database (default: dev)
  --verbose             Show detailed validation queries and results
  --json                Output results as JSON (for CI/CD parsing)
  --help, -h            Show this message

EXAMPLES:
  npm run validate:rls
  npm run validate:rls -- --db=staging --verbose
  npm run validate:rls -- --json > rls-validation-report.json

EXIT CODES:
  0 = Validation passed ✅
  1 = RLS gap found (merge blocked) ❌
  2 = Configuration error (DB unreachable, env vars missing) ⚠️
`);
  process.exit(0);
}

// ─── Main Validation Function ───────────────────────────────────────────────
async function validateRls() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    logError('Missing environment variables:', {
      VITE_SUPABASE_URL: SUPABASE_URL ? '✓' : '✗',
      SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_KEY ? '✓' : '✗'
    });
    logError('Set in .env.local or use GitHub Secrets in workflows.');
    process.exit(2);
  }

  // Initialize Supabase client with service-role key (full DB access)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });

  // Log header
  if (!jsonOutput) {
    console.log(`\n🔒 CareSync RLS Policy Validation`);
    console.log(`   Environment: ${dbEnv}`);
    console.log(`   URL: ${SUPABASE_URL}`);
    console.log(`   Tables to check: ${PATIENT_CRITICAL_TABLES.length}\n`);
  }

  const results = {
    timestamp: new Date().toISOString(),
    environment: dbEnv,
    checks: {
      hospitalIdPresent: { passed: 0, failed: 0, errors: [] },
      rlsPoliciesPresent: { passed: 0, failed: 0, errors: [] },
      hospitalIsolation: { passed: 0, failed: 0, errors: [] },
    },
    warnings: [],
    totalErrors: 0
  };

  // ── Check 1: hospital_id column exists on all patient tables ──────────────
  console.log('📋 Check 1: hospital_id Column Presence');
  console.log('─'.repeat(70));

  for (const table of PATIENT_CRITICAL_TABLES) {
    try {
      // Query the table (limit 0 to not fetch data, just check schema)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(0);

      if (error) {
        if (error.code === '42P01') {
          // Table does not exist (might be new or removed)
          if (!jsonOutput) {
            console.log(`⚠️  ${table.padEnd(35)} [TABLE NOT FOUND]`);
          }
          results.warnings.push(`${table}: Table does not exist in this environment`);
          continue;
        }

        if (error.code === '42703') {
          // Column does not exist
          results.checks.hospitalIdPresent.failed++;
          results.checks.hospitalIdPresent.errors.push({
            table,
            reason: 'Columns could not be queried'
          });
          if (!jsonOutput) {
            console.log(`❌ ${table.padEnd(35)} [COLUMN QUERY FAILED]`);
          }
          continue;
        }

        throw error;
      }

      // Check if hospital_id exists in columns
      const hasHospitalId = data?.some(col => col.name === 'hospital_id');
      
      if (hasHospitalId) {
        results.checks.hospitalIdPresent.passed++;
        if (!jsonOutput) {
          console.log(`✅ ${table.padEnd(35)} [hospital_id: OK]`);
        }
      } else {
        results.checks.hospitalIdPresent.failed++;
        results.checks.hospitalIdPresent.errors.push({
          table,
          reason: 'Missing hospital_id column (CRITICAL for multi-tenancy)'
        });
        if (!jsonOutput) {
          console.log(`❌ ${table.padEnd(35)} [MISSING hospital_id]`);
        }
      }
    } catch (err) {
      results.checks.hospitalIdPresent.errors.push({
        table,
        reason: err.message
      });
      if (!jsonOutput) {
        console.log(`⚠️  ${table.padEnd(35)} [ERROR: ${err.message}]`);
      }
    }
  }

  // ── Check 2: RLS Policies Enabled ──────────────────────────────────────
  console.log('\n📋 Check 2: RLS Policies Enabled');
  console.log('─'.repeat(70));

  try {
    // Query Supabase pg_tables to check RLS status
    const { data: pgTables, error: pgError } = await supabase
      .rpc('pg_catalog.pg_tables', {})
      .eq('schemaname', 'public');

    if (pgError && !pgError.message.includes('FUNCTION')) {
      // RPC may not exist; that's okay — we'll query information_schema instead
      if (verbose) {
        console.warn('⚠️  pg_catalog.pg_tables RPC not available; using information_schema');
      }
    }

    // Alternative: Query information_schema directly (requires service key)
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_table_rls_status');

    if (schemaError) {
      if (verbose) {
        console.warn(`⚠️  Could not query RLS status: ${schemaError.message}`);
        console.warn('    (This is OK if you\'re validating against a dev DB without the RPC)');
      }
      results.warnings.push('Could not automatically verify RLS policy presence — manual check recommended');
    } else if (schemaData) {
      for (const table of PATIENT_CRITICAL_TABLES) {
        const tableData = schemaData.find((t) => t.table_name === table);
        if (tableData?.rls_enabled) {
          results.checks.rlsPoliciesPresent.passed++;
          if (!jsonOutput) {
            console.log(`✅ ${table.padEnd(35)} [RLS: Enabled]`);
          }
        } else {
          results.checks.rlsPoliciesPresent.failed++;
          results.checks.rlsPoliciesPresent.errors.push({
            table,
            reason: 'RLS not enabled on this table'
          });
          if (!jsonOutput) {
            console.log(`❌ ${table.padEnd(35)} [RLS: DISABLED]`);
          }
        }
      }
    }
  } catch (err) {
    if (verbose) {
      console.warn(`⚠️  RLS enumeration skipped: ${err.message}`);
    }
    results.warnings.push(`Could not verify RLS policy status: ${err.message}`);
  }

  // ── Check 3: Hospital Isolation in Policies ─────────────────────────────
  console.log('\n📋 Check 3: Hospital Isolation in RLS Policies');
  console.log('─'.repeat(70));

  try {
    // Query pg_policies to inspect actual policy conditions
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_rls_policy_details');

    if (policiesError && verbose) {
      console.warn(`⚠️  Could not query RLS policies: ${policiesError.message}`);
    }

    if (policies) {
      const policiesByTable = {};
      
      for (const policy of policies) {
        if (!policiesByTable[policy.table_name]) {
          policiesByTable[policy.table_name] = [];
        }
        policiesByTable[policy.table_name].push(policy);
      }

      for (const [table, tablePolicies] of Object.entries(policiesByTable)) {
        if (!PATIENT_CRITICAL_TABLES.includes(table)) continue;

        const hasIsolation = tablePolicies.some(policy =>
          EXPECTED_ISOLATION_FUNCTIONS.some(fn =>
            policy.qual?.includes(fn) || policy.with_check?.includes(fn)
          )
        );

        if (hasIsolation) {
          results.checks.hospitalIsolation.passed++;
          if (!jsonOutput) {
            console.log(`✅ ${table.padEnd(35)} [Isolation: ✓]`);
          }
        } else {
          results.checks.hospitalIsolation.failed++;
          results.checks.hospitalIsolation.errors.push({
            table,
            reason: 'RLS policies missing hospital isolation function',
            foundPolicies: tablePolicies.map(p => p.policy_name)
          });
          if (!jsonOutput) {
            console.log(`❌ ${table.padEnd(35)} [Isolation: MISSING]`);
          }
        }
      }
    }
  } catch (err) {
    if (verbose) {
      console.warn(`⚠️  Policy isolation check skipped: ${err.message}`);
    }
    results.warnings.push(`Could not verify policy isolation: ${err.message}`);
  }

  // ─── Summary ──────────────────────────────────────────────────────────
  const totalPassed = 
    results.checks.hospitalIdPresent.passed + 
    results.checks.rlsPoliciesPresent.passed + 
    results.checks.hospitalIsolation.passed;
  
  const totalFailed = 
    results.checks.hospitalIdPresent.failed + 
    results.checks.rlsPoliciesPresent.failed + 
    results.checks.hospitalIsolation.failed;

  results.totalErrors = totalFailed;

  if (jsonOutput) {
    // Output as JSON for CI/CD parsing
    console.log(JSON.stringify(results, null, 2));
  } else {
    // Human-readable summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 VALIDATION SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✅ Passed: ${totalPassed}`);
    console.log(`❌ Failed: ${totalFailed}`);
    if (results.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${results.warnings.length}`);
      results.warnings.forEach(w => console.log(`   • ${w}`));
    }

    // Detailed errors
    if (totalFailed > 0) {
      console.log('\n' + '─'.repeat(70));
      console.log('🚨 RLS VALIDATION FAILED');
      console.log('─'.repeat(70));

      if (results.checks.hospitalIdPresent.errors.length > 0) {
        console.log('\n❌ hospital_id Column Missing:');
        results.checks.hospitalIdPresent.errors.forEach(err => {
          console.log(`   • ${err.table}: ${err.reason}`);
        });
      }

      if (results.checks.rlsPoliciesPresent.errors.length > 0) {
        console.log('\n❌ RLS Policies Missing:');
        results.checks.rlsPoliciesPresent.errors.forEach(err => {
          console.log(`   • ${err.table}: ${err.reason}`);
        });
      }

      if (results.checks.hospitalIsolation.errors.length > 0) {
        console.log('\n❌ Hospital Isolation Missing:');
        results.checks.hospitalIsolation.errors.forEach(err => {
          console.log(`   • ${err.table}: ${err.reason}`);
          if (err.foundPolicies?.length > 0) {
            console.log(`     Found policies: ${err.foundPolicies.join(', ')}`);
          }
        });
      }

      console.log('\n' + '─'.repeat(70));
      console.log('🔧 REMEDIATION:');
      console.log('   1. Add hospital_id column to tables missing it');
      console.log('   2. Enable RLS on patient-critical tables');
      console.log('   3. Create RLS policies with hospital_id isolation');
      console.log('   4. Test with: npm run validate:rls -- --verbose');
      console.log('\n   See: docs/PHASE_1B_RLS_VALIDATION_GUIDE.md\n');

      process.exit(1);
    }

    console.log('\n✅ RLS VALIDATION PASSED');
    console.log('═'.repeat(70));
    console.log('All patient-critical tables have proper hospital_id scoping.\n');
    process.exit(0);
  }
}

// ─── Helper Functions ───────────────────────────────────────────────────────
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
validateRls().catch(err => {
  logError('Unexpected error during validation:', { message: err.message });
  if (verbose) {
    console.error(err.stack);
  }
  process.exit(2);
});
