/**
 * Seed test data for E2E testing
 * Creates test users for all 6 roles with consistent hospital scoping
 *
 * Usage: npm run test:e2e:seed
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEST_ROLES = ['patient', 'doctor', 'pharmacy', 'laboratory', 'receptionist', 'admin'];
const TEST_HOSPITAL_ID = process.env.TEST_HOSPITAL_ID || 'hp1';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPass123!';

interface TestUserConfig {
  role: string;
  email: string;
  full_name: string;
}

async function seedTestUsers() {
  console.log('🌱 Seeding E2E test data...\n');

  const testUsers: TestUserConfig[] = TEST_ROLES.map((role) => ({
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
      console.log(`   🔐 Password: ${TEST_PASSWORD}\n`);
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
