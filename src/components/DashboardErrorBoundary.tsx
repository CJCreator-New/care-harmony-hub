import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { sanitizeLogMessage } from '@/utils/sanitize';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  roleName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

export class DashboardErrorBoundary extends Component<Props, State> {
  private maxRetries = 2;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`DashboardErrorBoundary caught an error${this.props.roleName ? ` in ${this.props.roleName} dashboard` : ''}:`, sanitizeLogMessage(error.message));

    // Log detailed error info in development
    if (import.meta.env.DEV) {
      console.group('Dashboard Error Boundary Details');
      console.error('Error:', sanitizeLogMessage(error.message));
      console.error('Component Stack:', sanitizeLogMessage(errorInfo.componentStack || ''));
      console.error('Role:', this.props.roleName || 'Unknown');
      console.groupEnd();
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  // Reset error state when the role changes so switching roles clears stale errors
  componentDidUpdate(prevProps: Props) {
    if (prevProps.roleName !== this.props.roleName && this.state.hasError) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: 0,
      });
    }
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    if (retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: retryCount + 1
      });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, retryCount } = this.state;
      const canRetry = retryCount < this.maxRetries;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">
                {this.props.roleName ? `${this.props.roleName} Dashboard Error` : 'Dashboard Error'}
              </CardTitle>
              <CardDescription>
                Something went wrong while loading the dashboard. This might be due to a temporary issue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error?.message || 'An unexpected error occurred'}
                  {retryCount > 0 && ` (Retry attempt ${retryCount}/${this.maxRetries})`}
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {canRetry && (
                  <Button onClick={this.handleRetry} variant="default">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}
                <Button onClick={this.handleReload} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {import.meta.env.DEV && error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Show Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for role switching
export const RoleSwitchErrorBoundary: React.FC<{ children: ReactNode; currentRole?: string }> = ({
  children,
  currentRole
}) => (
  <DashboardErrorBoundary
    roleName={currentRole}
    fallback={
      <div className="min-h-[300px] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <CardTitle>Dashboard Loading Error</CardTitle>
            <CardDescription>
              Unable to load the {currentRole} dashboard. This may be due to a temporary network issue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              Reload Application
            </Button>
          </CardContent>
        </Card>
      </div>
    }
  >
    {children}
  </DashboardErrorBoundary>
);