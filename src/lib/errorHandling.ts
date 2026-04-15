import { toast } from 'sonner';
import { sanitizeForLog } from '@/utils/sanitize';

/**
 * HP-3 PR3: Standardized Error Handling Utilities
 * 
 * Ensures all errors are:
 * - PHI-safe (no patient data in error messages)
 * - User-friendly (clear actions and next steps)
 * - Logged appropriately (for monitoring and compliance)
 * - Consistent across the application
 */

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export class ApplicationError extends Error {
  severity: ErrorSeverity;
  userMessage: string;
  context?: Record<string, unknown>;
  showNotification?: boolean;

  constructor(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    userMessage?: string,
    context?: Record<string, unknown>,
    showNotification?: boolean
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.severity = severity;
    this.userMessage = userMessage || message;
    this.context = context;
    this.showNotification = showNotification !== false;
  }
}

/**
 * Parse and standardize errors from various sources
 */
export const handleError = (error: unknown, context?: string): ApplicationError => {
  let appError: ApplicationError;

  if (error instanceof ApplicationError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new ApplicationError(
      error.message,
      ErrorSeverity.ERROR,
      'An unexpected error occurred. Please try again.',
      undefined,
      true
    );
  } else if (typeof error === 'string') {
    appError = new ApplicationError(error, ErrorSeverity.ERROR, error, undefined, true);
  } else {
    appError = new ApplicationError(
      'An unknown error occurred',
      ErrorSeverity.ERROR,
      'An unexpected error occurred. Please try again.',
      undefined,
      true
    );
  }

  // Add context if provided
  if (context) {
    appError.context = { context, ...(appError.context || {}) };
  }

  // Log sanitized error
  logError(appError);

  return appError;
};

/**
 * Log error with PHI sanitization for compliance
 */
export const logError = (error: ApplicationError) => {
  const sanitized = sanitizeForLog({
    message: error.message,
    severity: error.severity,
    userMessage: error.userMessage,
    context: error.context,
  });

  // Use appropriate log level
  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
      console.error('[CRITICAL]', sanitized);
      break;
    case ErrorSeverity.ERROR:
      console.error('[ERROR]', sanitized);
      break;
    case ErrorSeverity.WARNING:
      console.warn('[WARNING]', sanitized);
      break;
    case ErrorSeverity.INFO:
      console.info('[INFO]', sanitized);
      break;
  }
};

/**
 * Show user-friendly error notification
 */
export const showErrorNotification = (
  error: ApplicationError | unknown,
  options?: {
    duration?: number;
    action?: {
      label: string;
      onClick: () => void;
    };
  }
) => {
  const appError = error instanceof ApplicationError ? error : handleError(error);

  if (!appError.showNotification) {
    return;
  }

  const { duration, action } = options || {};

  switch (appError.severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.ERROR:
      toast.error(appError.userMessage, {
        duration: duration || 5000,
        action,
      });
      break;

    case ErrorSeverity.WARNING:
      toast.warning(appError.userMessage, {
        duration: duration || 4000,
        action,
      });
      break;

    case ErrorSeverity.INFO:
      toast.info(appError.userMessage, {
        duration: duration || 3000,
        action,
      });
      break;
  }
};

/**
 * Create standardized application error
 */
export const createApplicationError = (
  message: string,
  userMessage: string,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  context?: Record<string, unknown>
): ApplicationError => {
  return new ApplicationError(message, severity, userMessage, context, true);
};

/**
 * Handle API errors specifically
 */
export const handleApiError = (
  error: unknown,
  endpoint: string
): ApplicationError => {
  const appError = handleError(error);

  // Customize message based on error type
  if (appError instanceof Error) {
    if (appError.message.includes('401')) {
      appError.userMessage = 'Please log in again to continue.';
    } else if (appError.message.includes('403')) {
      appError.userMessage = 'You do not have permission to perform this action.';
    } else if (appError.message.includes('404')) {
      appError.userMessage = 'The requested resource was not found.';
    } else if (appError.message.includes('500')) {
      appError.severity = ErrorSeverity.CRITICAL;
      appError.userMessage = 'Server error. Our team has been notified. Please try again later.';
    } else if (appError.message.includes('Network')) {
      appError.userMessage = 'Network connection error. Please check your connection and try again.';
    }
  }

  // Add endpoint context
  appError.context = { endpoint, ...appError.context };

  return appError;
};

/**
 * Async error wrapper for form submissions and API calls
 */
export const asyncHandler = async <T,>(
  fn: () => Promise<T>,
  errorContext?: string
): Promise<T | null> => {
  try {
    return await fn();
  } catch (error) {
    const appError = handleError(error, errorContext);
    showErrorNotification(appError);
    return null;
  }
};

/**
 * Silent error handler (logs but doesn't show notification)
 */
export const handleSilentError = (error: unknown, context?: string) => {
  const appError = handleError(error, context);
  appError.showNotification = false;
  return appError;
};

export default {
  handleError,
  logError,
  showErrorNotification,
  createApplicationError,
  handleApiError,
  asyncHandler,
  handleSilentError,
};
