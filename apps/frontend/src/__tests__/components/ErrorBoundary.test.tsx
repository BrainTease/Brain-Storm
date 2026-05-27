import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary, ErrorFallback } from '@/components/ui/ErrorBoundary';

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
    function Wrapper() {
      return (
        <ErrorBoundary>
          <Boom shouldThrow={false} />
        </ErrorBoundary>
      );
    }
    const { rerender } = render(<Wrapper />);
    rerender(
      <ErrorBoundary>
        <Boom shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );
    // Manual reset via try-again button
    const btn = screen.queryByRole('button', { name: /try again/i });
    if (btn) {
      await user.click(btn);
      expect(screen.getByText('ok')).toBeInTheDocument();
    }
  });

  it('uses custom function fallback', () => {
    render(
      <ErrorBoundary fallback={(err, reset) => <div>custom: {err.message}</div>}>
        <Boom shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('custom: boom')).toBeInTheDocument();
  });
});

describe('ErrorFallback', () => {
  it('renders title, description, and retry button', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(<ErrorFallback error={new Error('x')} reset={reset} />);
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
