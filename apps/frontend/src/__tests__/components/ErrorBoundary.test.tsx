import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary, ErrorFallback } from '@/components/ui/ErrorBoundary';
import { ChunkLoadError } from '@/components/ui/ChunkLoadError';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import {
  categorizeError,
  isChunkLoadError,
  isNetworkError,
} from '@/lib/error-utils';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('boom');
  return <div>ok</div>;
}

describe('ErrorBoundary', () => {
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('renders default fallback on error', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('calls onError prop', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Boom shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledOnce();
  });

  it('resets when retry is clicked', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<ErrorFallback error={new Error('test')} reset={reset} />);
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('uses custom function fallback', () => {
    render(
      <ErrorBoundary fallback={(err) => <div>custom: {err.message}</div>}>
        <Boom shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('custom: boom')).toBeInTheDocument();
  });
});

describe('ErrorFallback', () => {
  it('renders retry and report buttons', () => {
    const reset = vi.fn();
    render(<ErrorFallback error={new Error('x')} reset={reset} />);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /report issue/i })).toBeInTheDocument();
  });

  it('shows network icon for network errors', () => {
    const reset = vi.fn();
    render(<ErrorFallback error={new Error('NetworkError')} reset={reset} />);
    expect(screen.getByText('🌐')).toBeInTheDocument();
  });
});

describe('ChunkLoadError', () => {
  it('renders refresh button', () => {
    render(<ChunkLoadError />);
    expect(screen.getByText(/new version available/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
  });
});

describe('OfflineBanner', () => {
  it('renders nothing when online', () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('error-utils', () => {
  it('detects chunk load errors', () => {
    expect(isChunkLoadError(new Error('Loading chunk 123 failed'))).toBe(true);
    expect(isChunkLoadError(new Error('Failed to fetch'))).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed'))).toBe(true);
    expect(isChunkLoadError(new Error('ChunkLoadError'))).toBe(true);
    expect(isChunkLoadError(new Error('random error'))).toBe(false);
  });

  it('detects network errors', () => {
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('NetworkError'))).toBe(true);
    expect(isNetworkError(new Error('random error'))).toBe(false);
  });

  it('categorizes errors correctly', () => {
    expect(categorizeError(new Error('Loading chunk 123'))).toBe('chunk-load');
    expect(categorizeError(new Error('Failed to fetch'))).toBe('chunk-load');
    expect(categorizeError(new Error('random error'))).toBe('runtime');
  });
});
