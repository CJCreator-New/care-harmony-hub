import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isCI = !!process.env.CI;
const testEnv = process.env.TEST_ENV || 'local';
const runId = process.env.TEST_RUN_ID || `test-${Date.now()}`;
const AUTH_DIR = path.join(__dirname, 'tests/e2e/.auth');

// Environment-specific base URLs
const baseURLs: Record<string, string> = {
  local: 'http://localhost:8080',
  dev: 'https://dev.caresync.com',
  staging: 'https://staging.caresync.com',
  production: 'https://caresync.com',
};

export default defineConfig({
  testDir: './tests/e2e',
  
  // Global setup and teardown
  // globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  
  // Test matching
  testMatch: /.*\.spec\.ts$/,
  testIgnore: /.*(wip|draft)\.spec\.ts$/,
  
  // Execution
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 4 : '50%',
  
  // Timeouts
  timeout: 60 * 1000,
  expect: { timeout: 10 * 1000 },
  
  // Output
  outputDir: `test-results/run-${runId}`,
  
  // Reporting
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: `test-results/results-${runId}.json` }],
    ['junit', { outputFile: `test-results/junit-${runId}.xml` }],
  ],

  use: {
    baseURL: baseURLs[testEnv],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Timeouts
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
    
    // Headers
    extraHTTPHeaders: {
      'X-Test-Run-ID': runId,
    },
    
    // Locale
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Viewport
    viewport: { width: 1920, height: 1080 },
    colorScheme: 'light',
  },

  projects: [
    // Setup project for auth
    // {
    //   name: 'setup',
    //   testMatch: /.*\.setup\.ts$/,
    // },

    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      // dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      // dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      // dependencies: ['setup'],
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      // dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      // dependencies: ['setup'],
    },

    // Accessibility testing
    {
      name: 'accessibility',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*accessibility.*\.spec\.ts$/,
      // dependencies: ['setup'],
    },

    // Performance testing
    {
      name: 'performance',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*performance.*\.spec\.ts$/,
      // dependencies: ['setup'],
    },

    // Visual regression
    {
      name: 'visual',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*visual.*\.spec\.ts$/,
      // dependencies: ['setup'],
    },
  ],

  // Web server
  webServer: {
    command: 'npm run dev',
    url: baseURLs.local,
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      VITE_E2E_MOCK_AUTH: 'true',
    },
  },

  // Metadata
  metadata: {
    project: 'CareSync HMS',
    environment: testEnv,
  },
});
