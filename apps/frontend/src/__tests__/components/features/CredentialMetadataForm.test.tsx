/**
 * Unit tests for CredentialMetadataForm — issue #965
 *
 * Covers:
 *   - loading state renders spinner
 *   - empty state renders when fetchMetadata resolves null
 *   - error state renders on rejection + retry re-triggers fetch
 *   - success state renders form fields
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import {
  CredentialMetadataForm,
  type CredentialMetadata,
} from '@/components/features/credential-metadata/CredentialMetadataForm';

const MOCK_METADATA: CredentialMetadata = {
  id: 'cred-1',
  name: 'Blockchain Fundamentals',
  description: 'Certificate of completion',
  issuedAt: '2026-01-15T10:00:00.000Z',
  courseId: 'course-42',
};

describe('CredentialMetadataForm — state transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  it('renders the loading state while the fetch is in-flight', () => {
    // Never-resolving promise keeps component in loading state
    const fetchMetadata = vi.fn(() => new Promise<CredentialMetadata | null>(() => {}));

    render(<CredentialMetadataForm fetchMetadata={fetchMetadata} />);

    expect(screen.getByTestId('credential-metadata-loading')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /loading credential metadata/i })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------
  it('renders the empty state when fetchMetadata resolves null', async () => {
    const fetchMetadata = vi.fn().mockResolvedValue(null);

    render(<CredentialMetadataForm fetchMetadata={fetchMetadata} />);

    await waitFor(() => {
      expect(screen.getByTestId('credential-metadata-empty')).toBeInTheDocument();
    });

    expect(screen.getByText(/no credential metadata found/i)).toBeInTheDocument();
    // Loading state must be gone
    expect(screen.queryByTestId('credential-metadata-loading')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  it('renders the error state when fetchMetadata rejects', async () => {
    const fetchMetadata = vi.fn().mockRejectedValue(new Error('Network failure'));

    render(<CredentialMetadataForm fetchMetadata={fetchMetadata} />);

    await waitFor(() => {
      expect(screen.getByTestId('credential-metadata-error')).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/network failure/i)).toBeInTheDocument();
    expect(screen.queryByTestId('credential-metadata-loading')).not.toBeInTheDocument();
  });

  it('shows a fallback message for non-Error rejections', async () => {
    const fetchMetadata = vi.fn().mockRejectedValue('plain string error');

    render(<CredentialMetadataForm fetchMetadata={fetchMetadata} />);

    await waitFor(() => {
      expect(screen.getByTestId('credential-metadata-error')).toBeInTheDocument();
    });

    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Retry action
  // ---------------------------------------------------------------------------
  it('re-triggers fetchMetadata when the Retry button is clicked', async () => {
    const fetchMetadata = vi
      .fn()
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce(MOCK_METADATA);

    render(<CredentialMetadataForm fetchMetadata={fetchMetadata} />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId('credential-metadata-retry')).toBeInTheDocument();
    });

    expect(fetchMetadata).toHaveBeenCalledTimes(1);

    // Click Retry
    fireEvent.click(screen.getByTestId('credential-metadata-retry'));

    // Should now show success
    await waitFor(() => {
      expect(screen.getByTestId('credential-metadata-form')).toBeInTheDocument();
    });

    expect(fetchMetadata).toHaveBeenCalledTimes(2);
  });

  // ---------------------------------------------------------------------------
  // Success state
  // ---------------------------------------------------------------------------
  it('renders form fields when fetchMetadata resolves with data', async () => {
    const fetchMetadata = vi.fn().mockResolvedValue(MOCK_METADATA);

    render(<CredentialMetadataForm fetchMetadata={fetchMetadata} />);

    await waitFor(() => {
      expect(screen.getByTestId('credential-metadata-form')).toBeInTheDocument();
    });

    expect(screen.getByText('Blockchain Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Certificate of completion')).toBeInTheDocument();
    // Loading & error states gone
    expect(screen.queryByTestId('credential-metadata-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('credential-metadata-error')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // State distinctness (all three visually separate)
  // ---------------------------------------------------------------------------
  it('each state is visually distinct via data-testid selectors', async () => {
    // loading
    const pendingFetch = vi.fn(() => new Promise<null>(() => {}));
    const { unmount: unmountLoading } = render(
      <CredentialMetadataForm fetchMetadata={pendingFetch} />,
    );
    expect(screen.getByTestId('credential-metadata-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('credential-metadata-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('credential-metadata-error')).not.toBeInTheDocument();
    unmountLoading();

    // empty
    const emptyFetch = vi.fn().mockResolvedValue(null);
    const { unmount: unmountEmpty } = render(
      <CredentialMetadataForm fetchMetadata={emptyFetch} />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('credential-metadata-empty')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('credential-metadata-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('credential-metadata-error')).not.toBeInTheDocument();
    unmountEmpty();

    // error
    const errorFetch = vi.fn().mockRejectedValue(new Error('fail'));
    render(<CredentialMetadataForm fetchMetadata={errorFetch} />);
    await waitFor(() =>
      expect(screen.getByTestId('credential-metadata-error')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('credential-metadata-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('credential-metadata-empty')).not.toBeInTheDocument();
  });
});
