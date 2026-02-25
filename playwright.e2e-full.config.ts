/**
 * Full E2E Test Suite Configuration
 *
 * Orchestrates 5 phases of testing in dependency order:
 *   setup ──> auth ──> permissions ──> workflows ──> security
 *
 * Run with: npx playwright test --config=playwright.e2e-full.config.ts
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const isCI = !!process.env.CI;
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8080';

// Storage state paths shared across phases
export const AUTH_STATE_DIR = path.join('test-results', '.auth-full');

export default defineConfig({
  fullyParallel: false,
  retries: isCI ? 1 : 0,
  workers: 1,          // workflows phase requires serial execution
  timeout: 120_000,
  expect: { timeout: 15_000 },

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-full' }],
    ['json', { outputFile: 'test-results/full-suite-results.json' }],
  ],

  use: {
    baseURL: BASE_URL,
    headless: isCI,
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  // Global setup seeds the database; global teardown cleans test data
  globalSetup: './tests/e2e/global-setup-seed.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  projects: [
    // ─────────────────────────────────────────────────────────────
    // Phase 0 — setup: pre-authenticate all 7 roles and save states
    // ─────────────────────────────────────────────────────────────
    {
      name: 'setup',
      testDir: './tests/e2e/tests/setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // ─────────────────────────────────────────────────────────────
    // Phase 1 — auth: per-role login, negative cases, session mgmt
    // ─────────────────────────────────────────────────────────────
    {
      name: 'auth',
      testDir: './tests/e2e/tests/auth',
      testMatch: /auth-comprehensive\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },

    // ─────────────────────────────────────────────────────────────
    // Phase 2 — permissions: route-access matrix + CRUD operations
    // ─────────────────────────────────────────────────────────────
    {
      name: 'permissions',
      testDir: './tests/e2e/tests/permissions',
      testMatch: /permission-matrix\.spec\.ts/,
      dependencies: ['auth'],
      use: { ...devices['Desktop Chrome'] },
    },

    // ─────────────────────────────────────────────────────────────
    // Phase 3+4 — workflows: clinical chain + cross-role handoffs
    //   Must run serially; later steps depend on earlier DB state
    // ─────────────────────────────────────────────────────────────
    {
      name: 'workflows',
      testDir: './tests/e2e/tests/workflows',
      testMatch: /(clinical-chain|cross-role-data)\.spec\.ts/,
      dependencies: ['permissions'],
      use: {
        ...devices['Desktop Chrome'],
        // Slower actions to observe state transitions clearly
        launchOptions: { slowMo: isCI ? 0 : 100 },
      },
    },

    // ─────────────────────────────────────────────────────────────
    // Phase 5 — security: privilege escalation, HIPAA, audit logs
    // ─────────────────────────────────────────────────────────────
    {
      name: 'security',
      testDir: './tests/e2e/tests/security',
      testMatch: /hipaa-security\.spec\.ts/,
      dependencies: ['workflows'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev -- --host 0.0.0.0 --port 8080',
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    env: { TEST_MODE: 'true', VITE_TEST_MODE: 'true' },
  },
});
