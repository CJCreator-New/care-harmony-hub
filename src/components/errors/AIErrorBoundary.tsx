import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AIErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AI Component Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 border rounded-lg bg-destructive/10 text-destructive">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">AI Feature Error</h3>
          </div>
          <p className="text-sm mb-3">
            The AI feature encountered an error and could not complete the operation.
          </p>
          {this.state.error && (
            <p className="text-xs text-muted-foreground mb-3">
              Error: {this.state.error.message}
            </p>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={this.handleReset}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AIErrorBoundary;
