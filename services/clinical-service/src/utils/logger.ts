import pino from 'pino';
import { config } from '../config/environment';

export const logger = pino({
  level: config.LOG_LEVEL,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  serializers: {
    // Strip sensitive data from logs
    req: (req) => {
      const sanitized = { ...req };
      // Remove sensitive headers
      if (sanitized.headers) {
        delete sanitized.headers.authorization;
        delete sanitized.headers['x-api-key'];
      }
      return sanitized;
    },
    res: (res) => {
      const sanitized = { ...res };
      // Remove sensitive response data
      return sanitized;
    },
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'res.body.password',
      'res.body.token',
      '*.password',
      '*.token',
      '*.ssn',
      '*.medical_record_number',
    ],
    censor: '[REDACTED]',
  },
});

// Utility function to sanitize data for logging
export function sanitizeForLog(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const sanitized = { ...data };

  // Remove or mask sensitive fields
  const sensitiveFields = [
    'password', 'token', 'ssn', 'medical_record_number',
    'social_security_number', 'credit_card', 'bank_account'
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}