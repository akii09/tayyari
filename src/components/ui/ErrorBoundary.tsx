"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangleIcon, RefreshIcon, HomeIcon } from "@/components/icons/Icons";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      errorId: ""
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
    
    // Log error to monitoring service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
          <div className="glass-card max-w-md w-full p-8 text-center">
            <div className="mb-6">
              <AlertTriangleIcon className="w-16 h-16 text-warning mx-auto mb-4" />
              <h1 className="text-heading-lg text-text-primary mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-text-secondary mb-4">
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left bg-bg-tertiary p-4 rounded-lg mb-4">
                  <summary className="cursor-pointer text-text-muted text-sm">
                    Error Details (Development)
                  </summary>
                  <pre className="text-xs text-error mt-2 overflow-auto">
                    {this.state.error.message}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center gap-2 bg-electric-blue hover:bg-electric-blue/90 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                <RefreshIcon className="w-4 h-4" />
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 bg-bg-secondary hover:bg-bg-tertiary text-text-primary px-4 py-3 rounded-lg font-medium transition-colors"
              >
                <RefreshIcon className="w-4 h-4" />
                Reload Page
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full flex items-center justify-center gap-2 text-text-secondary hover:text-text-primary px-4 py-3 font-medium transition-colors"
              >
                <HomeIcon className="w-4 h-4" />
                Go Home
              </button>
            </div>

            <p className="text-xs text-text-muted mt-6">
              Error ID: {this.state.errorId}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for handling async errors in functional components
export function useErrorHandler() {
  const handleError = (error: Error, context?: string) => {
    console.error(`Error ${context ? `in ${context}` : ''}:`, error);
    
    // You could integrate with error reporting service here
    // e.g., Sentry, LogRocket, etc.
    
    // Show user-friendly notification
    if ((window as any).showNotification) {
      (window as any).showNotification({
        type: 'error',
        title: 'Something went wrong',
        message: 'We encountered an error. Please try again.',
        duration: 5000
      });
    }
  };

  return { handleError };
}
