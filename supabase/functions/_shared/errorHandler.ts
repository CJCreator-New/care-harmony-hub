import { sanitizeLogMessage } from './sanitizeLog.ts';

/**
 * HP-3 PR2: Centralized Error Handling for Supabase Edge Functions
 *
 * Provides:
 * - Standard error response format
 * - Automatic PHI redaction
 * - Proper HTTP status codes
 * - Correlation ID propagation
 * - HIPAA-compliant error logging
 *
 * Usage in edge functions:
 * ```
 * try {
 *   const result = await processPatient(patientId);
 *   return errorHandler.success(result);
 * } catch (error) {
 *   return errorHandler.error(error, req);
 * }
 * ```
 */

// ============================================================================
// ERROR CLASSES WITH BUILT-IN SANITIZATION
// ============================================================================

/**
 * Base error class with sanitization
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }

  getSanitizedMessage(): string {
    return sanitizeLogMessage(this.message);
  }
}

/** 4xx: Client errors */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, 'BAD_REQUEST');
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Not authenticated') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Not authorized') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', public resourceType?: string) {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public fields?: Record<string, string[]>
  ) {
    super(message, 422, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMITED');
    this.name = 'RateLimitError';
  }
}

/** 5xx: Server errors */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
    this.name = 'InternalServerError';
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

// ============================================================================
// STANDARD ERROR RESPONSE FORMAT
// ============================================================================

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string; // Sanitized for production
    details?: Record<string, any>; // Only in development
  };
  requestId?: string; // Correlation ID
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  requestId?: string; // Correlation ID
}

// ============================================================================
// CENTRALIZED ERROR HANDLER
// ============================================================================

export class EdgeFunctionErrorHandler {
  private isDevelopment: boolean;

  constructor(isDevelopment: boolean = Deno.env.get('ENVIRONMENT') !== 'production') {
    this.isDevelopment = isDevelopment;
  }

  /**
   * Format success response
   */
  success<T>(data: T, requestId?: string): SuccessResponse<T> {
    return {
      success: true,
      data,
      ...(requestId && { requestId }),
    };
  }

  /**
   * Format error response with automatic sanitization
   */
  error(error: unknown, requestId?: string): ErrorResponse {
    const appError = this.normalizeError(error);

    // Log the error (sanitized)
    this.logError(appError, requestId);

    // Return sanitized response
    return {
      success: false,
      error: {
        code: appError.code,
        message: this.isDevelopment
          ? appError.getSanitizedMessage()
          : this.getPublicErrorMessage(appError),
        ...(this.isDevelopment && { details: this.getErrorDetails(appError) }),
      },
      ...(requestId && { requestId }),
    };
  }

  /**
   * Normalize any error type to AppError
   */
  private normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new InternalServerError(sanitizeLogMessage(error.message));
    }

    if (typeof error === 'string') {
      return new InternalServerError(sanitizeLogMessage(error));
    }

    return new InternalServerError('An unexpected error occurred');
  }

  /**
   * Get public error message (no PHI, safe for user display)
   */
  private getPublicErrorMessage(error: AppError): string {
    const messages: Record<string, string> = {
      BAD_REQUEST: 'Invalid request. Please check your input.',
      UNAUTHORIZED: 'You are not authenticated. Please log in.',
      FORBIDDEN: 'You do not have permission to perform this action.',
      NOT_FOUND: 'The requested resource was not found.',
      CONFLICT: 'The request conflicts with existing data.',
      VALIDATION_ERROR: 'Your input is invalid. Please review and try again.',
      RATE_LIMITED: 'Too many requests. Please try again later.',
      INTERNAL_ERROR: 'An error occurred. Please contact support.',
      SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later.',
    };

    return messages[error.code] || 'An error occurred. Please contact support.';
  }

  /**
   * Extract error details (development only)
   */
  private getErrorDetails(error: AppError): Record<string, any> {
    const details: Record<string, any> = {
      code: error.code,
      message: error.getSanitizedMessage(),
      timestamp: new Date().toISOString(),
    };

    if (error instanceof ValidationError && error.fields) {
      details.fields = error.fields;
    }

    if (error instanceof Error && error.stack) {
      details.stack = error.stack.split('\\n').slice(0, 5); // First 5 frames only
    }

    return details;
  }

  /**
   * Log error with sanitization and context
   */
  private logError(error: AppError, requestId?: string): void {
    const env = typeof Deno !== 'undefined'
      ? Deno.env.get('ENVIRONMENT') || 'unknown'
      : process.env.NODE_ENV || 'unknown';

    const logData = {
      timestamp: new Date().toISOString(),
      errorCode: error.code,
      statusCode: error.statusCode,
      message: error.getSanitizedMessage(),
      ...(requestId && { requestId }),
      environment: env,
    };

    // Use appropriate log level based on status code
    if (error.statusCode >= 500) {
      console.error('[ERROR]', JSON.stringify(logData));
    } else if (error.statusCode >= 400) {
      console.warn('[WARN]', JSON.stringify(logData));
    } else {
      console.info('[INFO]', JSON.stringify(logData));
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE FOR EDGE FUNCTIONS
// ============================================================================

const isDev = typeof Deno !== 'undefined'
  ? Deno.env.get('ENVIRONMENT') !== 'production'
  : process.env.NODE_ENV !== 'production';

export const errorHandler = new EdgeFunctionErrorHandler(isDev);

/**
 * HTTP response wrapper with error handling
 */
export function createErrorResponse(
  error: unknown,
  requestId?: string,
  status: number = 500
): Response {
  const response = errorHandler.error(error, requestId);
  const statusCode = error instanceof AppError ? error.statusCode : status;

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId || 'unknown',
    },
  });
}

export function createSuccessResponse<T>(
  data: T,
  requestId?: string,
  status: number = 200
): Response {
  const response = errorHandler.success(data, requestId);

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId || 'unknown',
    },
  });
}

/**
 * Wrap async handler with automatic error catching
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(error, args[0]?.requestId);
    }
  }) as T;
}
