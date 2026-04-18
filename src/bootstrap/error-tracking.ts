/**
 * Error Tracking Initialization Module
 * Handles Sentry and error tracking setup
 */

import { initializeSentry } from '@/utils/sentry-integration';
import { initErrorTracking } from '@/utils/errorTracking';

export interface ErrorTrackingConfig {
  dsn?: string;
  environment: 'development' | 'staging' | 'production';
  mode: string;
}

export function setupErrorTracking(config: ErrorTrackingConfig): void {
  initErrorTracking({
    dsn: config.dsn,
    environment: config.environment,
  });

  initializeSentry(config.dsn, config.mode);
}
