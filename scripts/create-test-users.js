#!/usr/bin/env node

/**
 * Test Users Creation Script
 * Creates test users in Supabase Auth for E2E testing.
 *
 * S0-11 / SECF-21 / OPS-17:
 * - Refuses to run against the production Supabase project (ref from supabase/config.toml).
 *   Use a local stack (`supabase start`) or the dedicated test/staging project.
 * - No shared password in the repo. Supply a per-run password via E2E_TEST_PASSWORD
 *   (or per role via E2E_<ROLE>_PASSWORD, e.g. E2E_LAB_TECHNICIAN_PASSWORD).
 *   Passwords are never printed.
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exitIfProductionTarget } from './lib/supabase-target-guard.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables (.env is optional when SUPABASE_URL is exported)
const envPath = join(__dirname, '..', '.env');
const envContent = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key] = value.replace(/"/g, '');
  }
});

const supabaseUrl = process.env.SUPABASE_URL || envVars.VITE_SUPABASE_URL;

if (!supabaseUrl) {
  console.error('SUPABASE_URL (or VITE_SUPABASE_URL in .env) is required');
  process.exit(1);
}
exitIfProductionTarget(supabaseUrl, 'SUPABASE_URL / VITE_SUPABASE_URL', 'scripts/create-test-users.js');

const MOCK_AUTH_PASSWORD = 'MockAuthOnly-NotARealAccount-0'; // .env.test, DEV mock auth only

/** Per-run password: E2E_<ROLE>_PASSWORD, else E2E_TEST_PASSWORD. Never a repo literal. */
function passwordFor(envRole) {
  const value = process.env[`E2E_${envRole}_PASSWORD`] || process.env.E2E_TEST_PASSWORD || '';
  if (value.length < 12) {
    console.error(`Set E2E_TEST_PASSWORD (or E2E_${envRole}_PASSWORD) to a per-run password of at least 12 characters.`);
    process.exit(1);
  }
  if (value === MOCK_AUTH_PASSWORD || value === envVars.VITE_E2E_MOCK_PASSWORD) {
    console.error('Do not reuse the committed mock-auth password (VITE_E2E_MOCK_PASSWORD) for real accounts.');
    process.exit(1);
  }
  return value;
}

// You'll need the service role key for creating users
// This should be set in your environment or passed as an argument
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Get your service role key from: Supabase Dashboard > Settings > API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test user data matching the database migration - WITH SPECIFIC UUIDs
const testUsers = [
  {
    id: '550e8400-e29b-41d4-a716-446655440003', // Admin user ID
    email: 'admin@testgeneral.com',
    password: passwordFor('ADMIN'),
    user_metadata: {
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin'
    }
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005', // Doctor user ID
    email: 'doctor@testgeneral.com',
    password: passwordFor('DOCTOR'),
    user_metadata: {
      first_name: 'Dr. Jane',
      last_name: 'Smith',
      role: 'doctor'
    }
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440007', // Nurse user ID
    email: 'nurse@testgeneral.com',
    password: passwordFor('NURSE'),
    user_metadata: {
      first_name: 'Nancy',
      last_name: 'Nurse',
      role: 'nurse'
    }
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440009', // Receptionist user ID
    email: 'reception@testgeneral.com',
    password: passwordFor('RECEPTIONIST'),
    user_metadata: {
      first_name: 'Rachel',
      last_name: 'Receptionist',
      role: 'receptionist'
    }
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011', // Pharmacist user ID
    email: 'pharmacy@testgeneral.com',
    password: passwordFor('PHARMACIST'),
    user_metadata: {
      first_name: 'Phil',
      last_name: 'Pharmacist',
      role: 'pharmacist'
    }
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440013', // Lab Tech user ID
    email: 'lab@testgeneral.com',
    password: passwordFor('LAB_TECHNICIAN'),
    user_metadata: {
      first_name: 'Larry',
      last_name: 'LabTech',
      role: 'lab_tech'
    }
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440015', // Patient user ID
    email: 'patient@testgeneral.com',
    password: passwordFor('PATIENT'),
    user_metadata: {
      first_name: 'John',
      last_name: 'Patient',
      role: 'patient'
    }
  }
];

async function createTestUsers() {
  console.log('🚀 Creating test users for E2E testing...\n');

  for (const userData of testUsers) {
    try {
      console.log(`Creating user: ${userData.email} (ID: ${userData.id})`);

      const { data, error } = await supabase.auth.admin.createUser({
        id: userData.id, // Use specific UUID to match database
        email: userData.email,
        password: userData.password,
        user_metadata: userData.user_metadata,
        email_confirm: true // Auto-confirm email for testing
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`  ⚠️  User ${userData.email} already exists, skipping...`);
        } else {
          console.error(`  ❌ Failed to create user ${userData.email}:`, error.message);
        }
      } else {
        console.log(`  ✅ Created user ${userData.email} with ID: ${data.user.id}`);
      }
    } catch (err) {
      console.error(`  ❌ Unexpected error creating user ${userData.email}:`, err.message);
    }
  }

  console.log('\n🎉 Test users creation completed!');  console.log('\n📋 Test User Credentials:');
  testUsers.forEach(user => {
    console.log(`  ${user.email} (Role: ${user.user_metadata.role}) - password from env, not printed`);
  });
  console.log('\n� User IDs for reference:');
  testUsers.forEach(user => {
    console.log(`  ${user.email} -> ${user.id}`);
  });
}

// Run the script
createTestUsers().catch(console.error);