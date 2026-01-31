import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
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

export class ChartErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Chart Component Error:', error, errorInfo);
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
        <div className="flex flex-col items-center justify-center h-full p-4 border rounded-lg bg-muted/50">
          <BarChart3 className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            Chart could not be rendered
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={this.handleReset}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh Chart
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ChartErrorBoundary;
