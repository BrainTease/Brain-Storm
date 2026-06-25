'use client';

import { useCallback, useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/Button';
import {
  categorizeError,
  getErrorDescription,
  getErrorTitle,
} from '@/lib/error-utils';

export default function CoursesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const category = categorizeError(error);

  useEffect(() => {
    Sentry.captureException(error, {
      tags: { errorBoundary: 'courses', category },
    });
  }, [error, category]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      reset();
    } finally {
      setIsRetrying(false);
    }
  }, [reset]);

  const reportIssue = useCallback(() => {
    const subject = encodeURIComponent('Courses Error Report from Brain Storm App');
    const body = encodeURIComponent(
      `Error: ${error?.message || 'Unknown error'}\n\nStack:\n${error?.stack || 'N/A'}`
    );
    window.location.href = `mailto:support@brainstorm.com?subject=${subject}&body=${body}`;
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl mb-6" aria-hidden="true">
        {category === 'network' ? '🌐' : '⚠️'}
      </div>
      <h1 className="text-2xl font-bold mb-2">{getErrorTitle(category)}</h1>
      <p className="text-gray-500 mb-6 max-w-md">{getErrorDescription(category)}</p>
      {error?.message && (
        <p className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded px-3 py-2 mb-6 max-w-md break-all font-mono">
          {error.message}
        </p>
      )}
      <div className="flex gap-3 flex-wrap justify-center">
        <Button onClick={handleRetry} disabled={isRetrying}>
          {isRetrying ? 'Retrying…' : 'Try Again'}
        </Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          Go Back
        </Button>
        <Button variant="outline" onClick={reportIssue}>
          Report Issue
        </Button>
      </div>
    </div>
  );
}
