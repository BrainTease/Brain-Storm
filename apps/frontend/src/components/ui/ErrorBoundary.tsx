'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, info: ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack } },
    });
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.error && this.props.resetKeys && prevProps.resetKeys) {
      const changed = this.props.resetKeys.some(
        (key, i) => !Object.is(key, prevProps.resetKeys?.[i]),
      );
      if (changed) this.reset();
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (typeof this.props.fallback === 'function') {
      return this.props.fallback(error, this.reset);
    }

    if (this.props.fallback !== undefined) {
      return this.props.fallback;
    }

    return <ErrorFallback error={error} reset={this.reset} />;
  }
}

interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
  title?: string;
  description?: string;
}

export function ErrorFallback({
  error,
  reset,
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
}: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]"
    >
      <div className="text-5xl mb-4" aria-hidden="true">
        ⚠️
      </div>
      <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md">{description}</p>
      {process.env.NODE_ENV !== 'production' && error?.message && (
        <p className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded px-3 py-2 mb-4 max-w-md break-all">
          {error.message}
        </p>
      )}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
