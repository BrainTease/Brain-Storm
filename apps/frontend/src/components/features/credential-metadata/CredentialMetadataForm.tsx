'use client';

// ⚠️  WARNING: This file is auto-generated to satisfy issue #965.
// Do NOT modify the state-machine logic without updating the companion unit tests.

import React, { useCallback, useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CredentialMetadata {
  id: string;
  name: string;
  description: string;
  issuedAt: string;
  courseId: string;
}

export type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: CredentialMetadata };

interface CredentialMetadataFormProps {
  /** Async function that resolves to metadata or null when the record is absent. */
  fetchMetadata: () => Promise<CredentialMetadata | null>;
  /** Called when the user submits a populated form. */
  onSubmit?: (data: CredentialMetadata) => void;
  /** Optional CSS override for the root container. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CredentialMetadataForm({
  fetchMetadata,
  onSubmit,
  className = '',
}: CredentialMetadataFormProps) {
  const [state, setState] = useState<FetchState>({ status: 'idle' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const data = await fetchMetadata();
      if (data === null) {
        setState({ status: 'empty' });
      } else {
        setState({ status: 'success', data });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setState({ status: 'error', message });
    }
  }, [fetchMetadata]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {state.status === 'loading' && <LoadingState />}
      {state.status === 'empty' && <EmptyState />}
      {state.status === 'error' && <ErrorState message={state.message} onRetry={load} />}
      {state.status === 'success' && (
        <SuccessState data={state.data} onSubmit={onSubmit} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-states
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading credential metadata"
      className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500 dark:text-gray-400"
      data-testid="credential-metadata-loading"
    >
      <Spinner size="lg" label="Loading credential metadata…" />
      <p className="text-sm">Loading credential metadata…</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-2 py-12 text-gray-500 dark:text-gray-400"
      data-testid="credential-metadata-empty"
    >
      {/* Simple document-off icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 opacity-40"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"
        />
      </svg>
      <p className="font-medium">No credential metadata found</p>
      <p className="text-sm">This credential has not been configured yet.</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center gap-4 py-12"
      data-testid="credential-metadata-error"
    >
      <div className="flex flex-col items-center gap-2 text-red-600 dark:text-red-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
        <p className="font-semibold">Failed to load credential metadata</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
      </div>
      <Button variant="outline" onClick={onRetry} data-testid="credential-metadata-retry">
        Retry
      </Button>
    </div>
  );
}

interface SuccessStateProps {
  data: CredentialMetadata;
  onSubmit?: (data: CredentialMetadata) => void;
}

function SuccessState({ data, onSubmit }: SuccessStateProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(data);
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Credential Metadata Form"
      data-testid="credential-metadata-form"
      className="space-y-4"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Credential Metadata
      </h2>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Name
        </label>
        <p className="rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
          {data.name}
        </p>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <p className="rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
          {data.description}
        </p>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Issued At
        </label>
        <p className="rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
          {new Date(data.issuedAt).toLocaleString()}
        </p>
      </div>

      {onSubmit && (
        <Button type="submit" variant="primary">
          Save
        </Button>
      )}
    </form>
  );
}
