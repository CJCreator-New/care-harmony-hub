#!/usr/bin/env node

/**
 * Test Users Creation Script
 * Creates test users in Supabase Auth for E2E testing
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key] = value.replace(/"/g, '');
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

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

// Test user data matching the migration
const testUsers = [
  {
    email: 'admin@testgeneral.com',
    password: 'TestPass123!',
    user_metadata: {
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin'
    }
  },
  {
    email: 'doctor@testgeneral.com',
    password: 'TestPass123!',
    user_metadata: {
      first_name: 'Dr. Jane',
      last_name: 'Smith',
      role: 'doctor'
    }
  },
  {
    email: 'nurse@testgeneral.com',
    password: 'TestPass123!',
    user_metadata: {
      first_name: 'Nancy',
      last_name: 'Nurse',
      role: 'nurse'
    }
  },
  {
    email: 'reception@testgeneral.com',
    password: 'TestPass123!',
    user_metadata: {
      first_name: 'Rachel',
      last_name: 'Receptionist',
      role: 'receptionist'
    }
  },
  {
    email: 'pharmacy@testgeneral.com',
    password: 'TestPass123!',
    user_metadata: {
      first_name: 'Phil',
      last_name: 'Pharmacist',
      role: 'pharmacist'
    }
  },
  {
    email: 'lab@testgeneral.com',
    password: 'TestPass123!',
    user_metadata: {
      first_name: 'Larry',
      last_name: 'LabTech',
      role: 'lab_tech'
    }
  },
  {
    email: 'patient@testgeneral.com',
    password: 'TestPass123!',
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
      console.log(`Creating user: ${userData.email}`);

      const { data, error } = await supabase.auth.admin.createUser({
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

  console.log('\n🎉 Test users creation completed!');
  console.log('\n📋 Test User Credentials:');
  testUsers.forEach(user => {
    console.log(`  ${user.email} / ${user.password}`);
  });
}

// Run the script
createTestUsers().catch(console.error);