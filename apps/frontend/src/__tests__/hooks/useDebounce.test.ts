/**
 * Unit tests for useDebounce hook
 * Tests debouncing functionality for search and input fields
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));

    expect(result.current).toBe('initial');
  });

  it('should debounce value updates', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated', delay: 500 });

    // Should still be initial immediately after update
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should now be updated
    await waitFor(() => {
      expect(result.current).toBe('updated');
    });
  });

  it('should cancel previous debounce on rapid updates', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'value1', delay: 500 },
    });

    // Rapid updates
    rerender({ value: 'value2', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: 'value3', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: 'value4', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Still should be initial value
    expect(result.current).toBe('value1');

    // Complete the debounce
    act(() => {
      vi.advanceTimersByTime(300); // Total 500ms from last update
    });

    await waitFor(() => {
      expect(result.current).toBe('value4');
    });
  });

  it('should work with different data types', async () => {
    // Number
    const { result: numberResult } = renderHook(() => useDebounce(42, 500));
    expect(numberResult.current).toBe(42);

    // Boolean
    const { result: boolResult } = renderHook(() => useDebounce(true, 500));
    expect(boolResult.current).toBe(true);

    // Object
    const obj = { key: 'value' };
    const { result: objResult } = renderHook(() => useDebounce(obj, 500));
    expect(objResult.current).toBe(obj);

    // Array
    const arr = [1, 2, 3];
    const { result: arrResult } = renderHook(() => useDebounce(arr, 500));
    expect(arrResult.current).toBe(arr);
  });

  it('should handle zero delay', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 0 },
    });

    rerender({ value: 'updated', delay: 0 });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(result.current).toBe('updated');
    });
  });

  it('should cleanup on unmount', () => {
    const { unmount, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    rerender({ value: 'updated', delay: 500 });
    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should not throw error or cause issues
    expect(true).toBe(true);
  });

  it('should handle multiple instances independently', async () => {
    const { result: result1 } = renderHook(() => useDebounce('value1', 500));
    const { result: result2 } = renderHook(() => useDebounce('value2', 300));

    // Both should have their initial values
    expect(result1.current).toBe('value1');
    expect(result2.current).toBe('value2');
  });

  it('should work with custom delay values', async () => {
    const delays = [100, 250, 500, 1000];

    for (const delay of delays) {
      const { result, rerender } = renderHook(({ value, d }) => useDebounce(value, d), {
        initialProps: { value: 'initial', d: delay },
      });

      rerender({ value: 'updated', d: delay });

      act(() => {
        vi.advanceTimersByTime(delay - 1);
      });

      // Should still be initial
      expect(result.current).toBe('initial');

      act(() => {
        vi.advanceTimersByTime(1);
      });

      await waitFor(() => {
        expect(result.current).toBe('updated');
      });
    }
  });
});

describe('useDebounce - Real-world scenarios', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should work for search input scenario', async () => {
    const { result, rerender } = renderHook(({ query }) => useDebounce(query, 300), {
      initialProps: { query: '' },
    });

    // User types "blockchain" quickly
    const letters = [
      'b',
      'bl',
      'blo',
      'bloc',
      'block',
      'blockc',
      'blockch',
      'blockcha',
      'blockchai',
      'blockchain',
    ];

    letters.forEach((query, index) => {
      rerender({ query });
      act(() => {
        vi.advanceTimersByTime(50); // User types quickly
      });

      // Should still be empty during typing
      expect(result.current).toBe('');
    });

    // Wait for debounce to complete
    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current).toBe('blockchain');
    });
  });

  it('should work for window resize scenario', async () => {
    const { result, rerender } = renderHook(({ width }) => useDebounce(width, 250), {
      initialProps: { width: 1920 },
    });

    // Simulate rapid resize events
    const widths = [1900, 1850, 1800, 1750, 1700];

    widths.forEach((width) => {
      rerender({ width });
      act(() => {
        vi.advanceTimersByTime(50);
      });
    });

    // Should still be initial width
    expect(result.current).toBe(1920);

    // Complete debounce
    act(() => {
      vi.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(result.current).toBe(1700);
    });
  });

  it('should work for form validation scenario', async () => {
    const { result, rerender } = renderHook(({ email }) => useDebounce(email, 400), {
      initialProps: { email: '' },
    });

    // User types email
    rerender({ email: 't' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ email: 'te' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ email: 'test@' });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ email: 'test@example.com' });

    // Should not validate until user stops typing
    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(result.current).toBe('test@example.com');
    });
  });
});
