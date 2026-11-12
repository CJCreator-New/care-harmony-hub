/**
 * Seed test data for E2E testing
 * Creates test users for all 6 roles with consistent hospital scoping
 *
 * Usage: npm run test:e2e:seed
 */

import { createClient } from '@supabase/supabase-js';
import { exitIfProductionTarget } from './lib/supabase-target-guard.mjs';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
// S0-11: no key literal. The local stack prints its anon key on `supabase start`.
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

exitIfProductionTarget(supabaseUrl, 'SUPABASE_URL', 'scripts/seed-e2e-data.mjs');
if (!supabaseAnonKey) {
  console.error('SUPABASE_ANON_KEY is required (use the anon key of the local or test project).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEST_ROLES = ['patient', 'doctor', 'pharmacy', 'laboratory', 'receptionist', 'admin'];
const TEST_HOSPITAL_ID = process.env.TEST_HOSPITAL_ID || 'hp1';
// S0-11 / SECF-21: no shared password literal. Supply a per-run value.
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || process.env.E2E_TEST_PASSWORD || '';
if (TEST_PASSWORD.length < 12) {
  console.error('Set TEST_USER_PASSWORD (or E2E_TEST_PASSWORD) to a per-run password of at least 12 characters.');
  process.exit(1);
}

async function seedTestUsers() {
  console.log('🌱 Seeding E2E test data...\n');

  const testUsers = TEST_ROLES.map((role) => ({
    role,
    email: `test-${role}@caresync.local`,
    full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
  }));

  for (const testUser of testUsers) {
    try {
      console.log(`📝 Creating ${testUser.role} user...`);

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', testUser.email)
        .single();

      if (existingUser) {
        console.log(`   ✅ User already exists: ${testUser.email}\n`);
        continue;
      }

      // Create auth user via Supabase admin (if service key available)
      // For local dev, use direct insert to profiles table
      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email: testUser.email,
        password: TEST_PASSWORD,
      });

      if (authError && !authError.message.includes('already exists')) {
        console.error(`   ❌ Auth error: ${authError.message}`);
        continue;
      }

      const userId = authUser?.user?.id || `${testUser.role}-${Date.now()}`;

      // Insert profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        email: testUser.email,
        role: testUser.role,
        hospital_id: TEST_HOSPITAL_ID,
        full_name: testUser.full_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error(`   ❌ Profile error: ${profileError.message}`);
        continue;
      }

      console.log(`   ✅ Created: ${testUser.email}`);
      console.log(`   🏥 Hospital: ${TEST_HOSPITAL_ID}`);
      console.log("   🔐 Password: (value of TEST_USER_PASSWORD / E2E_TEST_PASSWORD, not printed)\n");
    } catch (error) {
      console.error(`   ❌ Error: ${error}\n`);
    }
  }

  // Create test patients
  console.log('\n📋 Creating test patients...\n');
  try {
    for (let i = 1; i <= 5; i++) {
      const { error } = await supabase.from('patients').insert({
        mrn: `TEST-${String(i).padStart(4, '0')}`,
        first_name: `Test Patient`,
        last_name: `${i}`,
        date_of_birth: '1990-01-15',
        phone: `+123456789${i}`,
        email: `test-patient-${i}@test.local`,
        hospital_id: TEST_HOSPITAL_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.log(
          `   ⚠️  Patient TEST-${String(i).padStart(4, '0')}: ${error.message}`
        );
      } else {
        console.log(`   ✅ Created patient: TEST-${String(i).padStart(4, '0')}`);
      }
    }
  } catch (error) {
    console.error(`   ❌ Error seeding patients: ${error}`);
  }

  console.log('\n✨ E2E test data seeding complete!\n');
}

seedTestUsers().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
