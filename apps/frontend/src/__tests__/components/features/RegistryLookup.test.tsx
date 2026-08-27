/**
 * Unit tests for RegistryLookup — issue #968
 *
 * Acceptance criteria:
 *   - Debounce verified via unit test with fake timers
 *   - Stale-response race condition eliminated and tested
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RegistryLookup } from '@/components/features/registry/RegistryLookup';

const MOCK_RESULTS = [
  { id: 'r1', name: 'Alpha Contract', address: 'GABC1234567890ALPHAXYZ' },
  { id: 'r2', name: 'Beta Registry', address: 'GBETA987654321XYZ' },
];

describe('RegistryLookup — debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does NOT call search on every keystroke (debounce is applied)', async () => {
    const search = vi.fn().mockResolvedValue(MOCK_RESULTS);
    render(<RegistryLookup search={search} debounceMs={300} />);

    const input = screen.getByTestId('registry-search-input');

    // Simulate rapid typing — 5 keystrokes
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'al' } });
    fireEvent.change(input, { target: { value: 'alp' } });
    fireEvent.change(input, { target: { value: 'alph' } });
    fireEvent.change(input, { target: { value: 'alpha' } });

    // Before debounce settles — no search call yet
    expect(search).not.toHaveBeenCalled();

    // Let the debounce settle
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    // Called only once with the final value
    expect(search).toHaveBeenCalledWith('alpha', expect.any(AbortSignal));
  });

  it('fires search after debounce delay with the latest value', async () => {
    const search = vi.fn().mockResolvedValue([]);
    render(<RegistryLookup search={search} debounceMs={300} />);

    const input = screen.getByTestId('registry-search-input');

    fireEvent.change(input, { target: { value: 'stellar' } });

    // Advance 299ms — should NOT have fired yet
    await act(async () => {
      vi.advanceTimersByTime(299);
    });
    expect(search).not.toHaveBeenCalled();

    // Advance the final 1ms
    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    await waitFor(() => expect(search).toHaveBeenCalledOnce());
    expect(search).toHaveBeenCalledWith('stellar', expect.any(AbortSignal));
  });

  it('resets the debounce timer when the user keeps typing', async () => {
    const search = vi.fn().mockResolvedValue([]);
    render(<RegistryLookup search={search} debounceMs={300} />);

    const input = screen.getByTestId('registry-search-input');

    fireEvent.change(input, { target: { value: 'sol' } });
    await act(async () => vi.advanceTimersByTime(200));
    // Type again before 300ms — resets the timer
    fireEvent.change(input, { target: { value: 'soroban' } });
    await act(async () => vi.advanceTimersByTime(200));

    // Still within new debounce window — no call yet
    expect(search).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTime(100));
    await waitFor(() => expect(search).toHaveBeenCalledOnce());
    expect(search).toHaveBeenCalledWith('soroban', expect.any(AbortSignal));
  });
});

// ---------------------------------------------------------------------------
// Cancel in-flight requests (stale-response elimination)
// ---------------------------------------------------------------------------
describe('RegistryLookup — cancel in-flight requests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('passes an AbortSignal to the search function', async () => {
    const search = vi.fn().mockResolvedValue(MOCK_RESULTS);
    render(<RegistryLookup search={search} debounceMs={300} />);

    const input = screen.getByTestId('registry-search-input');
    fireEvent.change(input, { target: { value: 'test' } });

    await act(async () => vi.advanceTimersByTime(300));
    await waitFor(() => expect(search).toHaveBeenCalledOnce());

    const [, signal] = search.mock.calls[0] as [string, AbortSignal];
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it('aborts the previous request when a new debounced query fires', async () => {
    // Track all AbortSignals passed to search
    const signals: AbortSignal[] = [];

    const search = vi.fn().mockImplementation((_q: string, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<typeof MOCK_RESULTS>((resolve) => {
        // Resolve after a short time (simulating slow network)
        signal.addEventListener('abort', () => {/* absorbed */});
        setTimeout(() => resolve(MOCK_RESULTS), 500);
      });
    });

    render(<RegistryLookup search={search} debounceMs={300} />);
    const input = screen.getByTestId('registry-search-input');

    // First query
    fireEvent.change(input, { target: { value: 'alpha' } });
    await act(async () => vi.advanceTimersByTime(300));
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));

    // Second query fired before first resolves
    fireEvent.change(input, { target: { value: 'beta' } });
    await act(async () => vi.advanceTimersByTime(300));
    await waitFor(() => expect(search).toHaveBeenCalledTimes(2));

    // The first AbortSignal must have been aborted when the second query fired
    expect(signals[0].aborted).toBe(true);
    // Second signal should not be aborted yet
    expect(signals[1].aborted).toBe(false);
  });

  it('does NOT update results with a stale response after abort', async () => {
    // Simulate: first search is slow (600ms), second is fast (50ms)
    // If abort is not handled, the first response could overwrite the second.
    let resolveFirst!: (v: typeof MOCK_RESULTS) => void;
    const firstPromise = new Promise<typeof MOCK_RESULTS>((res) => {
      resolveFirst = res;
    });

    const search = vi
      .fn()
      .mockImplementationOnce((_q: string, signal: AbortSignal) => {
        // First call — slow, but respects signal
        return new Promise<typeof MOCK_RESULTS>((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
          firstPromise.then(resolve);
        });
      })
      .mockResolvedValueOnce([{ id: 'r3', name: 'Gamma Registry', address: 'GGAMMA' }]);

    render(<RegistryLookup search={search} debounceMs={300} />);
    const input = screen.getByTestId('registry-search-input');

    // Trigger first search
    fireEvent.change(input, { target: { value: 'slow-query' } });
    await act(async () => vi.advanceTimersByTime(300));
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));

    // Trigger second (fast) search — aborts the first
    fireEvent.change(input, { target: { value: 'fast-query' } });
    await act(async () => vi.advanceTimersByTime(300));
    await waitFor(() => expect(search).toHaveBeenCalledTimes(2));

    // Second resolves immediately
    await waitFor(() => {
      expect(screen.queryByTestId('registry-entry-r3')).toBeInTheDocument();
    });

    // Now resolve the first (stale) promise — should be ignored because it was aborted
    resolveFirst(MOCK_RESULTS);
    await act(async () => vi.advanceTimersByTime(100));

    // Stale results (r1, r2) must NOT appear
    expect(screen.queryByTestId('registry-entry-r1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('registry-entry-r2')).not.toBeInTheDocument();
    // Fresh result (r3) must still be visible
    expect(screen.getByTestId('registry-entry-r3')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// General rendering
// ---------------------------------------------------------------------------
describe('RegistryLookup — general rendering', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders search results after a successful search', async () => {
    const search = vi.fn().mockResolvedValue(MOCK_RESULTS);
    render(<RegistryLookup search={search} debounceMs={300} />);

    const input = screen.getByTestId('registry-search-input');
    fireEvent.change(input, { target: { value: 'alpha' } });
    await act(async () => vi.advanceTimersByTime(300));

    await waitFor(() => {
      expect(screen.getByTestId('registry-entry-r1')).toBeInTheDocument();
      expect(screen.getByTestId('registry-entry-r2')).toBeInTheDocument();
    });
  });

  it('shows an error message when search rejects', async () => {
    const search = vi.fn().mockRejectedValue(new Error('Registry unavailable'));
    render(<RegistryLookup search={search} debounceMs={300} />);

    const input = screen.getByTestId('registry-search-input');
    fireEvent.change(input, { target: { value: 'fail' } });
    await act(async () => vi.advanceTimersByTime(300));

    await waitFor(() => {
      expect(screen.getByTestId('registry-search-error')).toBeInTheDocument();
      expect(screen.getByText(/registry unavailable/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when search returns no results', async () => {
    const search = vi.fn().mockResolvedValue([]);
    render(<RegistryLookup search={search} debounceMs={300} />);

    const input = screen.getByTestId('registry-search-input');
    fireEvent.change(input, { target: { value: 'unknown' } });
    await act(async () => vi.advanceTimersByTime(300));

    await waitFor(() => {
      expect(screen.getByTestId('registry-search-empty')).toBeInTheDocument();
    });
  });

  it('clears results when the input is cleared', async () => {
    const search = vi.fn().mockResolvedValue(MOCK_RESULTS);
    render(<RegistryLookup search={search} debounceMs={300} />);

    const input = screen.getByTestId('registry-search-input');
    fireEvent.change(input, { target: { value: 'alpha' } });
    await act(async () => vi.advanceTimersByTime(300));
    await waitFor(() => expect(screen.getByTestId('registry-entry-r1')).toBeInTheDocument());

    // Clear the input
    fireEvent.change(input, { target: { value: '' } });
    await act(async () => vi.advanceTimersByTime(300));

    await waitFor(() => {
      expect(screen.queryByTestId('registry-entry-r1')).not.toBeInTheDocument();
    });
  });
});
