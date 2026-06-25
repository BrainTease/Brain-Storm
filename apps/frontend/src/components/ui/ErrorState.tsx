'use client';

import React, { useCallback, useState } from 'react';
import { Button } from './Button';
import { categorizeError, getErrorDescription, getErrorTitle } from '@/lib/error-utils';

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
  title,
  message,
  error,
  onRetry,
  retryLabel = 'Retry',
  isRetrying: externalRetrying,
  className = '',
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorObj = error instanceof Error ? error : error ? new Error(error) : null;
  const category = errorObj ? categorizeError(errorObj) : 'runtime';
  const displayTitle = title ?? getErrorTitle(category);
  const displayMessage = message ?? getErrorDescription(category);
  const [internalRetrying, setInternalRetrying] = useState(false);
  const isRetrying = externalRetrying ?? internalRetrying;

  const handleRetry = useCallback(async () => {
    if (!onRetry) return;
    setInternalRetrying(true);
    try {
      await onRetry();
    } finally {
      setInternalRetrying(false);
    }
  }, [onRetry]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-6 text-center border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/30 ${className}`}
    >
      <div className="text-3xl mb-2" aria-hidden="true">
        {category === 'network' ? '🌐' : '⚠️'}
      </div>
      <h3 className="text-base font-semibold text-red-900 dark:text-red-200 mb-1">
        {displayTitle}
      </h3>
      <p className="text-sm text-red-700 dark:text-red-300 mb-3 max-w-md">{displayMessage}</p>
      {process.env.NODE_ENV !== 'production' && errorMessage && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-3 max-w-md break-all font-mono">
          {errorMessage}
        </p>
      )}
      {onRetry && (
        <Button onClick={handleRetry} disabled={isRetrying}>
          {isRetrying ? 'Retrying…' : retryLabel}
        </Button>
      )}
    </div>
  );
}
