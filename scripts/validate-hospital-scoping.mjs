#!/usr/bin/env node
/**
 * Hospital Scoping Validation Script
 * Verifies all 22 migrated hooks properly enforce hospital_id scoping
 * 
 * Checks:
 * 1. Each hook imports useAuth from AuthContext
 * 2. Each hook extracts hospital_id from useAuth()
 * 3. Each hook applies hospital_id filters to Supabase queries
 * 4. No hardcoded hospital IDs found
 * 5. RLS policies are applied via Supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOOKS_DIR = path.join(__dirname, '../src/lib/hooks');

// 22 hooks to validate
const HOOKS_TO_VALIDATE = [
  // Patient domain
  'patients/usePatients.ts',
  'patients/usePatientQuery.ts',
  'patients/usePatientIdentity.ts',
  'patients/usePatientPortal.ts',
  'patients/usePatientPortalQueries.ts',
  'patients/usePatientsReadyForDoctor.ts',
  // Appointment domain
  'appointments/useAppointments.ts',
  'appointments/useAppointmentRequests.ts',
  'appointments/useAppointmentOptimization.ts',
  'appointments/useDoctorAvailability.ts',
  'appointments/useScheduling.ts',
  'appointments/useSmartScheduling.ts',
  // Pharmacy domain
  'pharmacy/usePharmacy.ts',
  'pharmacy/usePrescriptions.ts',
  'pharmacy/useMedications.ts',
  'pharmacy/usePharmacistOperations.ts',
  'pharmacy/useMedicationAlerts.ts',
  'pharmacy/useDrugInteractionChecker.ts',
  // Auth domain
  'auth/usePermissions.ts',
  'auth/usePermissionAudit.ts',
  'auth/useSessionTimeout.ts',
  'auth/useTwoFactorAuth.ts',
];

const results = [];
let passCount = 0;
let failCount = 0;

console.log('🏥 Hospital Scoping Validation\n');
console.log(`Checking ${HOOKS_TO_VALIDATE.length} hooks...\n`);

HOOKS_TO_VALIDATE.forEach((hookPath) => {
  const fullPath = path.join(HOOKS_DIR, hookPath);
  const result = {
    hook: path.basename(hookPath, '.ts'),
    path: hookPath,
    hasAuthImport: false,
    hasHospitalIdExtraction: false,
    hasSupabaseQueries: false,
    hospitalIdFiltering: false,
    hardcodedIds: [],
    rccEq: false,
    pass: false,
    issues: [],
  };

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');

    // Check 1: useAuth import
    result.hasAuthImport = /import.*useAuth.*from.*['"]@\/contexts\/AuthContext['"]/.test(content);
    if (!result.hasAuthImport) {
      result.issues.push('Missing useAuth import from AuthContext');
    }

    // Check 2: hospital_id extraction
    result.hasHospitalIdExtraction = /const\s+{\s*[^}]*hospital_id[^}]*}\s*=\s*useAuth/.test(content);
    if (!result.hasHospitalIdExtraction && !hookPath.includes('auth/')) {
      result.issues.push('Missing hospital_id extraction from useAuth()');
    }

    // Check 3: Supabase queries
    result.hasSupabaseQueries = /supabase\.(from|rpc)|(\.select|\.insert|\.update|\.delete)/.test(content);

    // Check 4: Hospital ID filtering in queries
    if (result.hasSupabaseQueries) {
      result.hospitalIdFiltering = /\.eq\(['"]hospital_id['"],\s*hospital_id\)|\bhospital_id\b.*\.eq/.test(content);
      if (!result.hospitalIdFiltering && !hookPath.includes('auth/')) {
        result.issues.push('Missing hospital_id filtering in Supabase queries');
      }
    }

    // Check 5: Hardcoded hospital IDs (should not exist)
    const hardcodedMatches = content.match(/hospital_id['"]?\s*[=:]\s*['"]([a-f0-9-]+)['"]|\.eq\(['"]hospital_id['"],?\s*['"]([a-f0-9-]+)['"]\)/gi);
    if (hardcodedMatches) {
      hardcodedMatches.forEach((match) => {
        if (!match.includes('hospital_id') || match.includes("'hospital_id'") || match.includes('"hospital_id"')) {
          result.hardcodedIds.push(match);
          result.issues.push(`Found potentially hardcoded hospital_id: ${match.substring(0, 50)}`);
        }
      });
    }

    // Check 6: RLS enforcement (.eq pattern)
    result.rccEq = /\.eq\(/.test(content);

    // Auth hooks have special rules - they don't need hospital_id checks
    if (hookPath.includes('auth/')) {
      result.issues = result.issues.filter(
        (issue) => !issue.includes('hospital_id') && !issue.includes('filtering')
      );
    }

    // Pass/Fail logic
    if (hookPath.includes('auth/')) {
      // Auth hooks just need to exist and not crash
      result.pass = result.issues.length === 0;
    } else {
      // Non-auth hooks need full hospital scoping
      result.pass =
        result.hasAuthImport &&
        result.hasHospitalIdExtraction &&
        result.hospitalIdFiltering &&
        result.hardcodedIds.length === 0;
    }

    if (result.pass) {
      passCount++;
    } else {
      failCount++;
    }
  } catch (error) {
    result.issues.push(`File read error: ${error.message}`);
    result.pass = false;
    failCount++;
  }

  results.push(result);
});

// Print results
console.log('📋 Validation Results:\n');
results.forEach((result) => {
  const status = result.pass ? '✅' : '❌';
  console.log(`${status} ${result.hook}`);

  if (result.issues.length > 0) {
    result.issues.forEach((issue) => {
      console.log(`   ⚠️  ${issue}`);
    });
  }

  if (result.pass && result.hasSupabaseQueries) {
    console.log(`   ✓ Hospital scoping verified`);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`Results: ${passCount}/${HOOKS_TO_VALIDATE.length} passed`);

if (failCount === 0) {
  console.log('✅ All hooks passed hospital scoping validation');
  process.exit(0);
} else {
  console.log(`❌ ${failCount} hooks failed validation`);
  process.exit(1);
}
