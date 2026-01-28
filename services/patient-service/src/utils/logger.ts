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
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// HIPAA-compliant logging utility
export function sanitizeForLog(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'ssn',
    'social_security_number',
    'medical_record_number',
    'health_insurance_id',
    'credit_card',
    'bank_account',
    'encryption_key',
    'jwt_secret',
    'api_key',
    'secret',
    'token',
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLog(sanitized[key]);
    }
  }

  return sanitized;
}

// Structured logging helpers
export const logRequest = (req: any, res: any, err?: any) => {
  const sanitizedReq = sanitizeForLog(req);
  const sanitizedRes = sanitizeForLog(res);

  if (err) {
    logger.error({ msg: 'Request failed', req: sanitizedReq, res: sanitizedRes, err: sanitizeForLog(err) });
  } else {
    logger.info({ msg: 'Request completed', req: sanitizedReq, res: sanitizedRes });
  }
};

export const logDatabaseOperation = (
  operation: string,
  table: string,
  params?: any,
  result?: any,
  error?: any
) => {
  const sanitizedParams = sanitizeForLog(params);
  const sanitizedResult = sanitizeForLog(result);

  if (error) {
    logger.error({ msg: 'Database operation failed', operation, table, params: sanitizedParams, error: sanitizeForLog(error) });
  } else {
    logger.debug({ msg: 'Database operation completed', operation, table, params: sanitizedParams, result: sanitizedResult });
  }
};

export const logKafkaMessage = (
  topic: string,
  message: any,
  direction: 'inbound' | 'outbound',
  error?: any
) => {
  const sanitizedMessage = sanitizeForLog(message);

  if (error) {
    logger.error({ msg: 'Kafka message processing failed', topic, direction, message: sanitizedMessage, error: sanitizeForLog(error) });
  } else {
    logger.debug({ msg: 'Kafka message processed', topic, direction, message: sanitizedMessage });
  }
};