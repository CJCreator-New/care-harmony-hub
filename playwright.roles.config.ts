import { defineConfig, devices } from '@playwright/test';
import { ROLE_PROJECTS } from './tests/e2e/framework/roles';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:8080';

export default defineConfig({
  testDir: './tests/e2e/framework',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['line'], ['html', { open: 'never', outputFolder: 'playwright-report-roles' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup-roles',
      testMatch: /auth\.setup\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    ...ROLE_PROJECTS.map((role) => ({
      name: role,
      testMatch: /access-control\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
      },
    })),
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
    env: {
      VITE_E2E_MOCK_AUTH: 'true',
    },
  },
});
