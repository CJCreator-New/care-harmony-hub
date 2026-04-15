import React, { ReactNode } from 'react';
import { AlertTriangle, HomeIcon } from 'lucide-react';
import { sanitizeForLog } from '@/utils/sanitize';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * HP-3 PR3: Error Boundary Component
 * 
 * Standardized error handling for CareSync HIMS
 * - Catches React component errors
 * - Prevents PHI leaks in error messages
 * - Provides graceful degradation + recovery options
 * - Logs errors with hospital scoping for compliance
 */

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: 'page' | 'section' | 'component';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

/**
 * Generic Error Boundary wrapper for React components
 * Catches and sanitizes errors to prevent PHI leaks
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log sanitized error for compliance
    const sanitized = sanitizeForLog({
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    console.error('[ErrorBoundary]', sanitized);

    // Track error count for monitoring
    this.setState(prev => ({
      errorCount: prev.errorCount + 1,
    }));

    // Custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-reset if too many errors (prevent infinite loops)
    if (this.state.errorCount > 5) {
      console.warn('[ErrorBoundary] Max error count exceeded, auto-resetting');
      setTimeout(() => {
        this.resetError();
      }, 5000);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorCount: 0,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback UI
      const level = this.props.level || 'component';

      return (
        <div className={`error-boundary-${level}`} role="alert">
          <Card className="border-destructive bg-destructive/10 p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
              
              <div className="flex-1">
                <h2 className="font-semibold text-destructive mb-2">
                  {level === 'page' ? 'Page Error' : 'Something went wrong'}
                </h2>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {level === 'page'
                    ? 'An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.'
                    : 'This section encountered an error. Try refreshing or navigating to a different page.'}
                </p>

                {/* Error details (only in development) */}
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-4 text-xs">
                    <summary className="cursor-pointer font-mono text-muted-foreground">
                      Error details (development only)
                    </summary>
                    <pre className="mt-2 p-2 bg-black/5 rounded overflow-auto max-h-40">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}

                {/* Recovery actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.resetError}
                    className="gap-2"
                  >
                    Try Again
                  </Button>

                  {level === 'page' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.location.href = '/';
                      }}
                      className="gap-2"
                    >
                      <HomeIcon className="h-4 w-4" />
                      Go Home
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for wrapping specific sections with error boundaries
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  level: 'page' | 'section' | 'component' = 'component',
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
) => {
  return (props: P) => (
    <ErrorBoundary level={level} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );
};

export default ErrorBoundary;
