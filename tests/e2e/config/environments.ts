/**
 * Multi-Environment Configuration
 * Supports local, dev, staging, and production environments
 */

export type Environment = 'local' | 'dev' | 'staging' | 'production';

export interface EnvironmentConfig {
  baseURL: string;
  apiURL: string;
  timeout: number;
  features: {
    enableMockAPI: boolean;
    enableTestData: boolean;
    enablePerformanceTracking: boolean;
    enableVisualRegression: boolean;
  };
}

export const ENVIRONMENTS: Record<Environment, EnvironmentConfig> = {
  local: {
    baseURL: 'http://localhost:8080',
    apiURL: 'http://localhost:3000/api',
    timeout: 30000,
    features: {
      enableMockAPI: true,
      enableTestData: true,
      enablePerformanceTracking: false,
      enableVisualRegression: true,
    },
  },
  dev: {
    baseURL: 'https://dev.caresync.com',
    apiURL: 'https://api-dev.caresync.com',
    timeout: 45000,
    features: {
      enableMockAPI: false,
      enableTestData: true,
      enablePerformanceTracking: true,
      enableVisualRegression: true,
    },
  },
  staging: {
    baseURL: 'https://staging.caresync.com',
    apiURL: 'https://api-staging.caresync.com',
    timeout: 45000,
    features: {
      enableMockAPI: false,
      enableTestData: true,
      enablePerformanceTracking: true,
      enableVisualRegression: true,
    },
  },
  production: {
    baseURL: 'https://caresync.com',
    apiURL: 'https://api.caresync.com',
    timeout: 60000,
    features: {
      enableMockAPI: false,
      enableTestData: false, // No test data in production
      enablePerformanceTracking: true,
      enableVisualRegression: false, // Smoke tests only
    },
  },
};

/**
 * Get environment configuration based on TEST_ENV variable
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const env = (process.env.TEST_ENV || 'local') as Environment;
  const config = ENVIRONMENTS[env];

  if (!config) {
    console.warn(`Unknown environment: ${env}, falling back to local`);
    return ENVIRONMENTS.local;
  }

  return config;
}

/**
 * Get current environment name
 */
export function getCurrentEnvironment(): Environment {
  return (process.env.TEST_ENV || 'local') as Environment;
}

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return !!process.env.CI;
}

/**
 * Get test run identifier for tracing
 */
export function getTestRunId(): string {
  return process.env.TEST_RUN_ID || `test-${Date.now()}`;
}
