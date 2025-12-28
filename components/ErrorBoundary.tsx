import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  section?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error to console for debugging
    console.error(`[ErrorBoundary${this.props.section ? ` - ${this.props.section}` : ''}]`, error, errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleCopyError = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    const errorText = `Error: ${error?.message}\n\nStack: ${error?.stack}\n\nComponent Stack: ${errorInfo?.componentStack}`;
    
    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      console.error('Failed to copy error:', e);
    }
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, showDetails, copied } = this.state;
    const { children, fallback, section } = this.props;

    if (hasError) {
      // Custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-red-500/5 border border-red-500/20 rounded-xl m-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-500/10 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-300">
                {section ? `${section} Error` : 'Something went wrong'}
              </h3>
              <p className="text-sm text-red-300/70">
                {error?.message || 'An unexpected error occurred'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors text-sm font-medium"
              aria-label="Try again"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
            
            <button
              onClick={() => this.setState({ showDetails: !showDetails })}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg transition-colors text-sm"
              aria-expanded={showDetails}
              aria-label={showDetails ? 'Hide error details' : 'Show error details'}
            >
              <Bug className="w-4 h-4" />
              Details
              {showDetails ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          </div>

          {showDetails && (
            <div className="w-full max-w-2xl mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Stack Trace</span>
                <button
                  onClick={this.handleCopyError}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-white/40 hover:text-white/60 hover:bg-white/5 rounded transition-colors"
                  aria-label="Copy error details"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-4 bg-black/40 border border-white/10 rounded-lg text-xs text-red-300/80 overflow-x-auto max-h-[200px] overflow-y-auto font-mono">
                {error?.stack}
              </pre>
              
              {errorInfo?.componentStack && (
                <>
                  <span className="text-xs font-medium text-white/40 uppercase tracking-wider mt-4 block mb-2">
                    Component Stack
                  </span>
                  <pre className="p-4 bg-black/40 border border-white/10 rounded-lg text-xs text-white/50 overflow-x-auto max-h-[150px] overflow-y-auto font-mono">
                    {errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      );
    }

    return children;
  }
}

// Convenience wrapper for functional components
interface WithErrorBoundaryOptions {
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  section?: string;
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...options}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );
  
  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  
  return ComponentWithErrorBoundary;
}

// Minimal inline error boundary for smaller components
interface InlineErrorProps {
  children: ReactNode;
  fallbackMessage?: string;
}

interface InlineErrorState {
  hasError: boolean;
}

export class InlineErrorBoundary extends Component<InlineErrorProps, InlineErrorState> {
  state: InlineErrorState = { hasError: false };

  static getDerivedStateFromError(): InlineErrorState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[InlineErrorBoundary]', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-red-400/80 bg-red-500/10 rounded-lg">
          <AlertTriangle className="w-3 h-3" />
          <span>{this.props.fallbackMessage || 'Failed to load'}</span>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="ml-auto text-red-400 hover:text-red-300 transition-colors"
            aria-label="Retry"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
