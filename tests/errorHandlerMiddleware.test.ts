import { describe, it, expect, beforeEach } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  EdgeFunctionErrorHandler,
  errorHandler,
  ErrorResponse,
  SuccessResponse,
  createErrorResponse,
  createSuccessResponse,
  withErrorHandling,
} from '../supabase/functions/_shared/errorHandler.ts';

/**
 * HP-3 PR2: Backend Error Handler Middleware Tests
 *
 * Validates:
 * - Error class hierarchy and sanitization
 * - Error response formatting
 * - PHI redaction in error messages
 * - HTTP status code mapping
 * - Development vs production error details
 *
 * HIPAA Compliance: Ensures no PHI leaks in error responses
 */

// ============================================================================
// TEST SUITE 1: ERROR CLASS CREATION & SANITIZATION
// ============================================================================

describe('Error Classes - Basic Functionality', () => {

  it('creates AppError with default parameters', () => {
    const error = new AppError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
  });

  it('AppError sanitizes message on getSanitizedMessage()', () => {
    const error = new AppError('Patient SSN 123-45-6789 failed');
    expect(error.getSanitizedMessage()).not.toContain('123-45-6789');
    expect(error.getSanitizedMessage()).toContain('[SSN]');
  });

  it('creates BadRequestError with correct status code', () => {
    const error = new BadRequestError('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
  });

  it('creates UnauthorizedError with correct status code', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('creates ForbiddenError with correct status code', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('creates NotFoundError with resource type', () => {
    const error = new NotFoundError('Patient not found', 'Patient');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.resourceType).toBe('Patient');
  });

  it('creates ConflictError with correct status code', () => {
    const error = new ConflictError('Duplicate appointment');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });

  it('creates ValidationError with field errors', () => {
    const fields = { email: ['Invalid email format'] };
    const error = new ValidationError('Validation failed', fields);
    expect(error.statusCode).toBe(422);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fields).toEqual(fields);
  });

  it('creates RateLimitError with correct status code', () => {
    const error = new RateLimitError();
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('RATE_LIMITED');
  });

  it('creates InternalServerError with correct status code', () => {
    const error = new InternalServerError();
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
  });

  it('creates ServiceUnavailableError with correct status code', () => {
    const error = new ServiceUnavailableError();
    expect(error.statusCode).toBe(503);
    expect(error.code).toBe('SERVICE_UNAVAILABLE');
  });

});

// ============================================================================
// TEST SUITE 2: ERROR HANDLER - SUCCESS RESPONSES
// ============================================================================

describe('EdgeFunctionErrorHandler - Success Responses', () => {

  let handler: EdgeFunctionErrorHandler;

  beforeEach(() => {
    handler = new EdgeFunctionErrorHandler(false); // production mode
  });

  it('formats success response without request ID', () => {
    const data = { id: '123', name: 'Test' };
    const response = handler.success(data);
    
    expect(response.success).toBe(true);
    expect(response.data).toEqual(data);
    expect(response.requestId).toBeUndefined();
  });

  it('formats success response with request ID', () => {
    const data = { id: '123' };
    const requestId = 'req-12345';
    const response = handler.success(data, requestId);
    
    expect(response.success).toBe(true);
    expect(response.data).toEqual(data);
    expect(response.requestId).toBe('req-12345');
  });

  it('handles null data in success response', () => {
    const response = handler.success(null);
    expect(response.success).toBe(true);
    expect(response.data).toBeNull();
  });

  it('handles array data in success response', () => {
    const data = [{ id: '1' }, { id: '2' }];
    const response = handler.success(data);
    expect(response.success).toBe(true);
    expect(response.data).toEqual(data);
  });

});

// ============================================================================
// TEST SUITE 3: ERROR HANDLER - ERROR RESPONSES (PRODUCTION)
// ============================================================================

describe('EdgeFunctionErrorHandler - Error Responses (Production)', () => {

  let handler: EdgeFunctionErrorHandler;

  beforeEach(() => {
    handler = new EdgeFunctionErrorHandler(false); // production mode
  });

  it('formats AppError without exposing PHI', () => {
    const error = new BadRequestError('Invalid patient SSN 123-45-6789');
    const response = handler.error(error);
    
    expect(response.success).toBe(false);
    expect(response.error.code).toBe('BAD_REQUEST');
    expect(response.error.message).not.toContain('123-45-6789');
  });

  it('uses public message in production mode', () => {
    const error = new InternalServerError('Database connection to 192.168.1.5 failed');
    const response = handler.error(error);
    
    expect(response.error.message).toBe('An error occurred. Please contact support.');
    expect(response.error.message).not.toContain('192.168.1.5');
  });

  it('includes request ID in error response', () => {
    const error = new NotFoundError('Patient not found');
    const response = handler.error(error, 'req-xyz123');
    
    expect(response.requestId).toBe('req-xyz123');
  });

  it('does not include details in production mode', () => {
    const error = new InternalServerError('Test error');
    const response = handler.error(error);
    
    expect(response.error.details).toBeUndefined();
  });

  it('normalizes Error object to AppError', () => {
    const error = new Error('Unexpected patient email: test@hospital.com');
    const response = handler.error(error);
    
    expect(response.success).toBe(false);
    expect(response.error.code).toBe('INTERNAL_ERROR');
    expect(response.error.message).not.toContain('test@hospital.com');
  });

  it('normalizes string to AppError', () => {
    const response = handler.error('Payment card 4532-1234-5678-9010 invalid');
    
    expect(response.success).toBe(false);
    expect(response.error.code).toBe('INTERNAL_ERROR');
    expect(response.error.message).not.toContain('4532-1234-5678-9010');
  });

  it('normalizes unknown type to AppError', () => {
    const response = handler.error({ unknownError: true });
    
    expect(response.success).toBe(false);
    expect(response.error.code).toBe('INTERNAL_ERROR');
  });

  it('provides specific message for each error code', () => {
    const testCases = [
      [new BadRequestError(''), 'Invalid request'],
      [new UnauthorizedError(), 'not authenticated'],
      [new ForbiddenError(), 'not have permission'],
      [new NotFoundError(), 'not found'],
      [new ConflictError(''), 'conflicts'],
      [new ValidationError(''), 'invalid'],
      [new RateLimitError(), 'Too many requests'],
      [new ServiceUnavailableError(), 'temporarily unavailable'],
    ];

    testCases.forEach(([error, expectedText]) => {
      const response = handler.error(error as AppError);
      expect(response.error.message.toLowerCase()).toContain(expectedText.toLowerCase());
    });
  });

});

// ============================================================================
// TEST SUITE 4: ERROR HANDLER - ERROR RESPONSES (DEVELOPMENT)
// ============================================================================

describe('EdgeFunctionErrorHandler - Error Responses (Development)', () => {

  let handler: EdgeFunctionErrorHandler;

  beforeEach(() => {
    handler = new EdgeFunctionErrorHandler(true); // development mode
  });

  it('includes details in development mode', () => {
    const error = new BadRequestError('Invalid input');
    const response = handler.error(error);
    
    expect(response.error.details).toBeDefined();
    expect(response.error.details?.code).toBe('BAD_REQUEST');
    expect(response.error.details?.message).toBe('Invalid input');
  });

  it('includes timestamp in development details', () => {
    const error = new InternalServerError('Test error');
    const response = handler.error(error);
    
    expect(response.error.details?.timestamp).toBeDefined();
  });

  it('includes validation fields in development details', () => {
    const fields = { email: ['Invalid format'], phone: ['Too short'] };
    const error = new ValidationError('Validation failed', fields);
    const response = handler.error(error);
    
    expect(response.error.details?.fields).toEqual(fields);
  });

  it('includes stack trace in development details', () => {
    const error = new Error('Test error');
    const response = handler.error(error);
    
    expect(response.error.details?.stack).toBeDefined();
    expect(Array.isArray(response.error.details?.stack)).toBe(true);
  });

  it('sanitizes PHI in development messages too', () => {
    const error = new InternalServerError('Patient SSN 123-45-6789 lookup failed');
    const response = handler.error(error);
    
    expect(response.error.message).not.toContain('123-45-6789');
    expect(response.error.message).toContain('[SSN]');
  });

});

// ============================================================================
// TEST SUITE 5: SINGLETON INSTANCE
// ============================================================================

describe('Singleton Error Handler Instance', () => {

  it('errorHandler is EdgeFunctionErrorHandler instance', () => {
    expect(errorHandler).toBeInstanceOf(EdgeFunctionErrorHandler);
  });

  it('errorHandler.success works', () => {
    const response = errorHandler.success({ test: true });
    expect(response.success).toBe(true);
  });

  it('errorHandler.error sanitizes messages', () => {
    const error = new InternalServerError('Email test@hospital.com failed');
    const response = errorHandler.error(error);
    expect(response.error.message).not.toContain('test@hospital.com');
  });

});

// ============================================================================
// TEST SUITE 6: RESPONSE FACTORY FUNCTIONS
// ============================================================================

describe('Response Factory Functions', () => {

  it('createErrorResponse returns Response object', async () => {
    const response = createErrorResponse(
      new BadRequestError('Invalid'),
      'req-123',
      400
    );
    
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(400);
  });

  it('createErrorResponse includes correlation ID header', async () => {
    const response = createErrorResponse(
      new NotFoundError('Not found'),
      'req-abc123'
    );
    
    expect(response.headers.get('X-Request-ID')).toBe('req-abc123');
  });

  it('createSuccessResponse returns Response object', async () => {
    const response = createSuccessResponse({ id: '1' }, 'req-123', 200);
    
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
  });

  it('createSuccessResponse includes correlation ID header', async () => {
    const response = createSuccessResponse({ data: true }, 'req-xyz');
    
    expect(response.headers.get('X-Request-ID')).toBe('req-xyz');
  });

  it('withErrorHandling wraps async handler', async () => {
    const originalHandler = async (req: any) => {
      if (req.fail) throw new Error('Failed');
      return { success: true };
    };

    const wrappedHandler = withErrorHandling(originalHandler);
    
    // Success case
    const result1 = await wrappedHandler({ fail: false });
    expect(result1.success).toBe(true);

    // Error case - returns Response
    const result2 = await wrappedHandler({ fail: true });
    expect(result2).toBeInstanceOf(Response);
  });

});
