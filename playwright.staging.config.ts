import { defineConfig, devices } from '@playwright/test';
import { assertStagingTargets, readStagingEnv } from './tests/e2e/staging/staging-env';

/**
 * Staging-only Playwright config (S0-07 clinical smoke test).
 * No local web server: the test targets an already-deployed staging app.
 * Refuses to load when E2E_STAGING_BASE_URL / E2E_STAGING_SUPABASE_URL is a
 * production host. See tests/e2e/staging/README.md.
 */
const env = readStagingEnv();
assertStagingTargets(env);

export default defineConfig({
  testDir: 'tests/e2e/staging',
  testMatch: /.*\.smoke\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  outputDir: 'test-results/staging',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/staging' }]],
  use: {
    baseURL: env.baseUrl,
    headless: true,
    // Traces and videos capture auth tokens and patient data; opt in explicitly.
    trace: process.env.E2E_STAGING_TRACE ? 'retain-on-failure' : 'off',
    video: 'off',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'staging-chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: process.env.E2E_CHROMIUM_EXECUTABLE_PATH
          ? { executablePath: process.env.E2E_CHROMIUM_EXECUTABLE_PATH }
          : {},
      },
    },
  ],
});
