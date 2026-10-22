import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useApiQuery } from '@/hooks/useApiQuery';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useApiQuery', () => {
  it('does not fetch and is not loading when the key is null', () => {
    const fetcher = vi.fn().mockResolvedValue('value');

    const { result } = renderHook(() => useApiQuery(null, fetcher));

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('loads data for a key and reports loading until it settles', async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: 1 });

    const { result } = renderHook(() => useApiQuery(['user', 1], fetcher));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ id: 1 });
    expect(result.current.error).toBeNull();
  });

  it('exposes initialData until the first load resolves', async () => {
    const pending = deferred<string[]>();

    const { result } = renderHook(() =>
      useApiQuery<string[]>(['list'], () => pending.promise, { initialData: [] })
    );

    expect(result.current.data).toEqual([]);

    await act(async () => pending.resolve(['a']));

    await waitFor(() => expect(result.current.data).toEqual(['a']));
  });

  it('uses the configured errorMessage when the fetcher rejects', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('HTTP 500'));

    const { result } = renderHook(() =>
      useApiQuery(['x'], fetcher, { errorMessage: 'Could not load x.' })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Could not load x.');
  });

  it("falls back to the rejection's message when no errorMessage is given", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('HTTP 503'));

    const { result } = renderHook(() => useApiQuery(['x'], fetcher));

    await waitFor(() => expect(result.current.error).toBe('HTTP 503'));
  });

  it('keeps the previous data when a refresh fails', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce('first')
      .mockRejectedValueOnce(new Error('down'));

    const { result } = renderHook(() => useApiQuery(['x'], fetcher));

    await waitFor(() => expect(result.current.data).toBe('first'));

    act(() => result.current.refresh());

    await waitFor(() => expect(result.current.error).toBe('down'));
    expect(result.current.data).toBe('first');
  });

  it('refresh re-runs the fetcher for the same key', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    const { result } = renderHook(() => useApiQuery(['x'], fetcher));

    await waitFor(() => expect(result.current.data).toBe(1));

    act(() => result.current.refresh());

    await waitFor(() => expect(result.current.data).toBe(2));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('refetches when the key changes and ignores a superseded response', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const fetcher = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result, rerender } = renderHook(({ id }) => useApiQuery(['item', id], fetcher), {
      initialProps: { id: 'a' },
    });

    rerender({ id: 'b' });
    expect(fetcher).toHaveBeenCalledTimes(2);

    await act(async () => second.resolve('B'));
    await waitFor(() => expect(result.current.data).toBe('B'));

    await act(async () => first.resolve('A'));
    expect(result.current.data).toBe('B');
  });

  it('does not refetch when the key is an equal but new array', () => {
    const fetcher = vi.fn().mockResolvedValue('v');

    const { rerender } = renderHook(({ id }) => useApiQuery(['item', id], fetcher), {
      initialProps: { id: 'a' },
    });

    rerender({ id: 'a' });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('uses the latest fetcher without refetching on every render', async () => {
    const calls: string[] = [];

    const { result, rerender } = renderHook(
      ({ label }) =>
        useApiQuery(['x'], async () => {
          calls.push(label);
          return label;
        }),
      { initialProps: { label: 'one' } }
    );

    await waitFor(() => expect(result.current.data).toBe('one'));

    rerender({ label: 'two' });

    expect(calls).toEqual(['one']);
  });
});
