/**
 * Logger Initialization Module
 * Handles structured logging setup
 */

import { createLogger } from '@/utils/logger';

export interface LoggerConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
}

export function setupLogger(config: LoggerConfig) {
  const logger = createLogger('app-bootstrap', {
    version: config.version,
    environment: config.environment,
  });

  return logger;
}
