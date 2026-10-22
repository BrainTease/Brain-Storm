/**
 * Unit tests for usePolling hook — issue #967
 *
 * Acceptance criteria:
 *   - No manual setInterval remains in polling widgets (enforced via hook)
 *   - Cleanup-on-unmount is unit tested
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePolling } from '@/hooks/usePolling';

const MOCK_DATA = { value: 42 };

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Initial fetch
  // ---------------------------------------------------------------------------
  it('calls fetchFn immediately when immediate=true (default)', () => {
    const fetchFn = vi.fn().mockResolvedValue(MOCK_DATA);
    renderHook(() => usePolling(fetchFn, { interval: 5000 }));

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('does NOT call fetchFn immediately when immediate=false', async () => {
    const fetchFn = vi.fn().mockResolvedValue(MOCK_DATA);
    renderHook(() => usePolling(fetchFn, { interval: 5000, immediate: false }));

    // Give a tick for any accidental immediate call
    await flushPromises();
    expect(fetchFn).toHaveBeenCalledTimes(0);
  });

  // ---------------------------------------------------------------------------
  // Polling interval
  // ---------------------------------------------------------------------------
  it('calls fetchFn again after each interval elapses', async () => {
    const fetchFn = vi.fn().mockResolvedValue(MOCK_DATA);
    renderHook(() => usePolling(fetchFn, { interval: 1000 }));

    // First immediate call
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Advance two full intervals
    await advance(1000);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    await advance(1000);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  // ---------------------------------------------------------------------------
  // Cleanup on unmount — key acceptance criterion for #967
  // ---------------------------------------------------------------------------
  it('clears the interval on unmount (no further calls after unmount)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(MOCK_DATA);
    const { unmount } = renderHook(() => usePolling(fetchFn, { interval: 1000 }));

    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Unmount while interval is still running
    unmount();

    // Advance timer — interval should already be cleared
    await advance(3000);

    // Must still be exactly 1 — no additional calls after unmount
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('clears the previous interval when dependencies change', async () => {
    const fetchFn = vi.fn().mockResolvedValue(MOCK_DATA);
    const { rerender, unmount } = renderHook(({ interval }) => usePolling(fetchFn, { interval }), {
      initialProps: { interval: 1000 },
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Change the interval — the old setInterval should have been cleared
    rerender({ interval: 2000 });

    // immediate=true triggers a fresh call on re-mount
    await flushPromises();
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // Advance only 1000ms — old interval would have fired, new one should not yet
    await advance(1000);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // Now 2000ms elapsed since rerender — new interval fires
    await advance(1000);
    expect(fetchFn).toHaveBeenCalledTimes(3);

    unmount();
  });

  // ---------------------------------------------------------------------------
  // Paused behaviour
  // ---------------------------------------------------------------------------
  it('does not start polling when paused=true', async () => {
    const fetchFn = vi.fn().mockResolvedValue(MOCK_DATA);
    renderHook(() => usePolling(fetchFn, { interval: 1000, paused: true }));

    await advance(5000);

    expect(fetchFn).toHaveBeenCalledTimes(0);
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------
  it('exposes error string when fetchFn rejects', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('Network down'));
    const { result } = renderHook(() => usePolling(fetchFn, { interval: 5000 }));

    await flushPromises();
    expect(result.current.error).toBe('Network down');
    expect(result.current.data).toBeNull();
  });

  it('exposes fallback error string for non-Error rejections', async () => {
    const fetchFn = vi.fn().mockRejectedValue('raw string');
    const { result } = renderHook(() => usePolling(fetchFn, { interval: 5000 }));

    await flushPromises();
    expect(result.current.error).toBe('Polling failed');
  });

  // ---------------------------------------------------------------------------
  // Manual refresh
  // ---------------------------------------------------------------------------
  it('refresh() triggers an immediate fetch outside the interval', async () => {
    const fetchFn = vi.fn().mockResolvedValue(MOCK_DATA);
    const { result } = renderHook(() => usePolling(fetchFn, { interval: 60_000 }));

    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Manually refresh before interval fires
    await act(async () => {
      result.current.refresh();
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  // ---------------------------------------------------------------------------
  // Data availability
  // ---------------------------------------------------------------------------
  it('exposes fetched data after a successful poll', async () => {
    const fetchFn = vi.fn().mockResolvedValue(MOCK_DATA);
    const { result } = renderHook(() => usePolling(fetchFn, { interval: 5000 }));

    await flushPromises();
    expect(result.current.data).toEqual(MOCK_DATA);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
