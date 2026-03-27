import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : 1,
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    headless: false,
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          slowMo: 300,
        },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
      },
    },
  ],
  webServer: {
    command: 'npx vite --host 0.0.0.0 --port 8080 --mode test',
    url: process.env.E2E_BASE_URL || 'http://localhost:8080',
    reuseExistingServer: !isCI,
    timeout: 180_000,
    env: {
      TEST_MODE: 'true',
      VITE_E2E_MOCK_AUTH: 'true',
    },
  },
});
