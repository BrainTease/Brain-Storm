'use client';

import { useCallback, useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from './Button';
import { categorizeError, getErrorDescription, getErrorTitle } from '@/lib/error-utils';

export interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Route segment name used for the Sentry `errorBoundary` tag and report subject. */
  boundary: string;
  /** The root boundary renders <main> and offers "Go Home" instead of "Go Back". */
  root?: boolean;
}

/**
 * Shared UI for Next.js route-level error.tsx boundaries. Every route
 * segment's error.tsx should delegate here instead of re-implementing
 * Sentry reporting, retry handling and the fallback layout.
 */
export function RouteError({ error, reset, boundary, root = false }: RouteErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const category = categorizeError(error);

  useEffect(() => {
    Sentry.captureException(error, {
      tags: { errorBoundary: boundary, category, digest: error.digest },
      extra: { href: typeof window !== 'undefined' ? window.location.href : '' },
    });
  }, [error, category, boundary]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      reset();
    } finally {
      setIsRetrying(false);
    }
  }, [reset]);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const reportIssue = useCallback(() => {
    const subject = encodeURIComponent(`Error Report from Brain Storm App (${boundary})`);
    const body = encodeURIComponent(
      `Error: ${error?.message || 'Unknown error'}\n\nStack:\n${error?.stack || 'N/A'}\n\nURL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`
    );
    window.location.href = `mailto:support@brainstorm.com?subject=${subject}&body=${body}`;
  }, [error, boundary]);

  const Wrapper = root ? 'main' : 'div';

  return (
    <Wrapper className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl mb-6" aria-hidden="true">
        {category === 'chunk-load' ? '🔄' : category === 'network' ? '🌐' : '⚠️'}
      </div>
      <h1 className="text-2xl font-bold mb-2">{getErrorTitle(category)}</h1>
      <p className="text-gray-500 mb-6 max-w-md">{getErrorDescription(category)}</p>
      {error?.message && (
        <p className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded px-3 py-2 mb-6 max-w-md break-all font-mono">
          {error.message}
        </p>
      )}
      <div className="flex gap-3 flex-wrap justify-center">
        {category === 'chunk-load' ? (
          <Button onClick={handleRefresh} disabled={isRetrying}>
            {isRetrying ? 'Refreshing…' : 'Refresh Page'}
          </Button>
        ) : (
          <Button onClick={handleRetry} disabled={isRetrying}>
            {isRetrying ? 'Retrying…' : 'Try Again'}
          </Button>
        )}
        {root ? (
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            Go Home
          </Button>
        ) : (
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        )}
        <Button variant="outline" onClick={reportIssue}>
          Report Issue
        </Button>
      </div>
    </Wrapper>
  );
}
