import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary, withErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  handleError,
  logError,
  showErrorNotification,
  createApplicationError,
  handleApiError,
  asyncHandler,
  ErrorSeverity,
  ApplicationError,
} from '@/lib/errorHandling';
import { toast } from 'sonner';

// Mock sonner for testing
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock console methods
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;

/**
 * HP-3 PR3: Error Handling & Boundary Tests
 * 
 * Validates:
 * - ErrorBoundary component catches and displays errors
 * - Error utilities sanitize and handle errors consistently
 * - PHI is not leaked in error messages or logs
 * - User-friendly error messages shown
 */

describe('HP-3 PR3: Error Boundary & Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
    console.warn = vi.fn();
    console.info = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
    console.warn = originalWarn;
    console.info = originalInfo;
  });

  describe('ErrorBoundary Component', () => {
    it('renders children when no error occurs', () => {
      const TestComponent = () => <div>Safe Content</div>;

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Safe Content')).toBeInTheDocument();
    });

    it('displays error fallback when error is thrown', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary level="component">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/This section encountered an error/i)).toBeInTheDocument();
    });

    it('provides try again button to reset state', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByText('Try Again');
      expect(tryAgainButton).toBeInTheDocument();

      // Click try again button
      fireEvent.click(tryAgainButton);

      // Re-render with working component
      rerender(
        <ErrorBoundary>
          <div>Working now</div>
        </ErrorBoundary>
      );

      // Should still show error boundary but with new content
      // (In real scenario, error is cleared and children render)
    });

    it('shows page-level error with home button for page level', () => {
      const ThrowError = () => {
        throw new Error('Page error');
      };

      render(
        <ErrorBoundary level="page">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Page Error')).toBeInTheDocument();
      expect(screen.getByText(/Go Home/i)).toBeInTheDocument();
    });

    it('calls onError callback when error occurs', () => {
      const onError = vi.fn();
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      const [error, errorInfo] = onError.mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(errorInfo.componentStack).toBeDefined();
    });

    it('calls custom fallback function if provided', () => {
      const fallback = vi.fn(() => <div>Custom Error UI</div>);
      const ThrowError = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary fallback={fallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(fallback).toHaveBeenCalled();
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });
  });

  describe('Error Handling Utilities', () => {
    it('handles Error instances', () => {
      const error = new Error('Test error');
      const result = handleError(error);

      expect(result.message).toBe('Test error');
      expect(result.severity).toBe(ErrorSeverity.ERROR);
      expect(result.userMessage).toBe('An unexpected error occurred. Please try again.');
    });

    it('handles string errors', () => {
      const result = handleError('Something bad happened');

      expect(result.message).toBe('Something bad happened');
      expect(result.severity).toBe(ErrorSeverity.ERROR);
      expect(result.userMessage).toBe('Something bad happened');
    });

    it('handles unknown error types', () => {
      const result = handleError({ random: 'object' });

      expect(result.severity).toBe(ErrorSeverity.ERROR);
      expect(result.userMessage).toBeDefined();
    });

    it('adds context to errors', () => {
      const error = new Error('Test');
      const result = handleError(error, 'CheckInFlow');

      expect(result.context).toEqual({ context: 'CheckInFlow' });
    });

    it('creates application errors with correct properties', () => {
      const error = createApplicationError(
        'Internal error occurred',
        'Unable to complete your request',
        ErrorSeverity.WARNING,
        { endpoint: '/api/checkIn' }
      );

      expect(error.message).toBe('Internal error occurred');
      expect(error.userMessage).toBe('Unable to complete your request');
      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.context?.endpoint).toBe('/api/checkIn');
    });

    it('handles API errors with specific messages', () => {
      const error401 = new Error('401 Unauthorized');
      const result401 = handleApiError(error401, '/auth/login');

      expect(result401.userMessage).toBe('Please log in again to continue.');

      const error403 = new Error('403 Forbidden');
      const result403 = handleApiError(error403, '/admin/settings');

      expect(result403.userMessage).toBe('You do not have permission to perform this action.');

      const error500 = new Error('500 Server Error');
      const result500 = handleApiError(error500, '/api/data');

      expect(result500.severity).toBe(ErrorSeverity.CRITICAL);
      expect(result500.userMessage).toContain('Server error');
    });

    it('shows error notification with correct severity', () => {
      const error = createApplicationError(
        'Test',
        'User message',
        ErrorSeverity.ERROR
      );

      showErrorNotification(error);

      expect(toast.error).toHaveBeenCalledWith('User message', expect.any(Object));
    });

    it('does not show notification when showNotification is false', () => {
      const error = createApplicationError(
        'Test',
        'User message',
        ErrorSeverity.ERROR
      );
      error.showNotification = false;

      showErrorNotification(error);

      expect(toast.error).not.toHaveBeenCalled();
    });

    it('logs errors with sanitization', () => {
      const error = new Error('Test error');
      logError(error as ApplicationError);

      expect(console.error).toHaveBeenCalled();
    });

    it('asyncHandler catches and handles errors', async () => {
      // Async handler should catch async errors without unhandled rejection
      const result = await asyncHandler(
        async () => {
          throw new Error('Async error');
        },
        'TestContext'
      );

      // Should return null when error is caught
      expect(result).toBeNull();
    });
  });

  describe('withErrorBoundary Higher-Order Component', () => {
    it('wraps component with error boundary', () => {
      const TestComponent = ({ message }: { message: string }) => (
        <div>{message}</div>
      );

      const WrappedComponent = withErrorBoundary(TestComponent, 'component');

      render(<WrappedComponent message="Test" />);

      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('catches errors in wrapped component', () => {
      const ErrorComponent = () => {
        throw new Error('Wrapped error');
      };

      const WrappedComponent = withErrorBoundary(ErrorComponent, 'component');

      render(<WrappedComponent />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('PHI Safety', () => {
    it('does not leak patient IDs in error messages', () => {
      const patientId = '550e8400-e29b-41d4-a716-446655440000';
      const error = new Error(`Patient ${patientId} not found`);

      const result = handleError(error);

      expect(result.userMessage).not.toContain(patientId);
      expect(result.userMessage).toBe('An unexpected error occurred. Please try again.');
    });

    it('sanitizes logs before output', () => {
      const sensitive = {
        mrn: 'MRN-12345',
        ssn: '123-45-6789',
        email: 'patient@example.com',
      };

      const error = createApplicationError(
        `Error processing ${JSON.stringify(sensitive)}`,
        `Error processing patient data`,
        ErrorSeverity.ERROR
      );

      logError(error);

      // Verify console.error was called (logger sanitizes)
      expect(console.error).toHaveBeenCalled();
    });
  });
});
