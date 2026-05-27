'use client';

import React from 'react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string | null;
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  isRetrying?: boolean;
  className?: string;
}

export function ErrorState({
  title = 'Failed to load',
  message = 'Something went wrong while loading this content.',
  error,
  onRetry,
  retryLabel = 'Retry',
  isRetrying = false,
  className = '',
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-6 text-center border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/30 ${className}`}
    >
      <div className="text-3xl mb-2" aria-hidden="true">
        ⚠️
      </div>
      <h3 className="text-base font-semibold text-red-900 dark:text-red-200 mb-1">
        {title}
      </h3>
      <p className="text-sm text-red-700 dark:text-red-300 mb-3 max-w-md">{message}</p>
      {process.env.NODE_ENV !== 'production' && errorMessage && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-3 max-w-md break-all font-mono">
          {errorMessage}
        </p>
      )}
      {onRetry && (
        <Button onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? 'Retrying…' : retryLabel}
        </Button>
      )}
    </div>
  );
}
