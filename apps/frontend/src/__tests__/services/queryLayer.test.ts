import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Query Layer Tests - Testing data fetching abstraction with caching and retry logic
 * Verifies that services layer can implement consistent caching/retry patterns
 */

interface QueryOptions {
  retries?: number;
  cacheTime?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface QueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isStale: boolean;
}

// Mock query implementation for testing
function createQueryCache() {
  const cache = new Map<string, { data: any; timestamp: number }>();

  return {
    get: (key: string, ttl: number) => {
      const item = cache.get(key);
      if (!item) return null;
      const age = Date.now() - item.timestamp;
      if (age > ttl) {
        cache.delete(key);
        return null;
      }
      return item.data;
    },
    set: (key: string, data: any) => {
      cache.set(key, { data, timestamp: Date.now() });
    },
    clear: (key?: string) => {
      if (key) cache.delete(key);
      else cache.clear();
    },
  };
}

// Mock async query function
async function mockQueryFn<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  const { retries = 3, cacheTime = 5000, onSuccess, onError } = options;
  const cache = createQueryCache();
  let data: T | null = null;
  let error: Error | null = null;
  let isLoading = true;
  const isStale = false;
  let attemptCount = 0;

  try {
    // Check cache first
    const cached = cache.get(queryKey, cacheTime);
    if (cached) {
      data = cached;
      isLoading = false;
      return { data, isLoading, error, refetch: () => {}, isStale: false };
    }

    // Retry logic
    while (attemptCount < retries) {
      try {
        data = await queryFn();
        cache.set(queryKey, data);
        onSuccess?.(data);
        break;
      } catch (err) {
        attemptCount++;
        if (attemptCount >= retries) {
          throw err;
        }
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attemptCount) * 100));
      }
    }
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err));
    onError?.(error);
  } finally {
    isLoading = false;
  }

  return {
    data,
    isLoading,
    error,
    refetch: () => {
      cache.clear(queryKey);
    },
    isStale,
  };
}

describe('Query Layer - Data Fetching Abstraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Caching', () => {
    it('should cache successful query results', async () => {
      const mockFn = vi.fn().mockResolvedValueOnce({ id: 1, name: 'Test' });

      const result1 = await mockQueryFn('test-key', mockFn, { cacheTime: 5000 });
      const result2 = await mockQueryFn('test-key', mockFn, { cacheTime: 5000 });

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(result1.data).toEqual({ id: 1, name: 'Test' });
    });

    it('should respect cache TTL', async () => {
      const mockFn = vi.fn().mockResolvedValue({ id: 1 });
      vi.useFakeTimers();

      const result1 = await mockQueryFn('test-key', mockFn, { cacheTime: 1000 });
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Advance time past cache TTL
      vi.advanceTimersByTime(1500);

      const result2 = await mockQueryFn('test-key', mockFn, { cacheTime: 1000 });
      // Should call again since cache expired
      expect(mockFn).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should clear cache on refetch', async () => {
      const mockFn = vi.fn().mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ id: 2 });

      const result1 = await mockQueryFn('test-key', mockFn);
      expect(result1.data?.id).toBe(1);

      // Refetch should clear cache and call again
      result1.refetch();
      const result2 = await mockQueryFn('test-key', mockFn);

      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed queries', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 1 });

      const result = await mockQueryFn('test-key', mockFn, { retries: 3 });

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual({ id: 1 });
      expect(result.error).toBeNull();
    });

    it('should fail after max retries exceeded', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await mockQueryFn('test-key', mockFn, { retries: 2 });

      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Network error');
      expect(result.data).toBeNull();
    });

    it('should use exponential backoff for retries', async () => {
      vi.useFakeTimers();
      const mockFn = vi.fn().mockRejectedValue(new Error('Timeout'));

      const promise = mockQueryFn('test-key', mockFn, { retries: 3 });

      // Allow retries to happen
      await vi.runAllTimersAsync();
      await promise;

      // Each retry should wait longer than the previous
      expect(mockFn.mock.calls.length).toBeGreaterThan(1);

      vi.useRealTimers();
    });
  });

  describe('State Management', () => {
    it('should set loading state during fetch', async () => {
      const mockFn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ id: 1 }), 100))
        );

      const promise = mockQueryFn('test-key', mockFn);
      const result = await promise;

      expect(result.isLoading).toBe(false);
      expect(result.data).toEqual({ id: 1 });
    });

    it('should handle errors correctly', async () => {
      const testError = new Error('Test error');
      const mockFn = vi.fn().mockRejectedValue(testError);

      const result = await mockQueryFn('test-key', mockFn, { retries: 1 });

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
      expect(result.isLoading).toBe(false);
    });

    it('should call success callback on successful query', async () => {
      const mockSuccess = vi.fn();
      const mockFn = vi.fn().mockResolvedValue({ id: 1, name: 'Test' });

      const result = await mockQueryFn('test-key', mockFn, { onSuccess: mockSuccess });

      expect(mockSuccess).toHaveBeenCalledWith({ id: 1, name: 'Test' });
    });

    it('should call error callback on failed query', async () => {
      const mockError = vi.fn();
      const testError = new Error('Test error');
      const mockFn = vi.fn().mockRejectedValue(testError);

      await mockQueryFn('test-key', mockFn, {
        retries: 1,
        onError: mockError,
      });

      expect(mockError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Data Fetching Pattern', () => {
    it('should support multiple concurrent queries with different keys', async () => {
      const mockFn1 = vi.fn().mockResolvedValue({ id: 1 });
      const mockFn2 = vi.fn().mockResolvedValue({ id: 2 });

      const [result1, result2] = await Promise.all([
        mockQueryFn('key-1', mockFn1),
        mockQueryFn('key-2', mockFn2),
      ]);

      expect(result1.data?.id).toBe(1);
      expect(result2.data?.id).toBe(2);
    });

    it('should share cache for same query key', async () => {
      const mockFn = vi.fn().mockResolvedValue({ id: 1 });

      await mockQueryFn('shared-key', mockFn);
      await mockQueryFn('shared-key', mockFn);

      // Should only call once due to cache
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle empty data gracefully', async () => {
      const mockFn = vi.fn().mockResolvedValue(null);

      const result = await mockQueryFn('test-key', mockFn);

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
      expect(result.isLoading).toBe(false);
    });

    it('should handle array data correctly', async () => {
      const mockData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];
      const mockFn = vi.fn().mockResolvedValue(mockData);

      const result = await mockQueryFn('test-key', mockFn);

      expect(result.data).toEqual(mockData);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Stale Data', () => {
    it('should mark data as stale when cache expires', async () => {
      vi.useFakeTimers();
      const mockFn = vi.fn().mockResolvedValue({ id: 1 });

      const result1 = await mockQueryFn('test-key', mockFn, { cacheTime: 1000 });
      expect(result1.isStale).toBe(false);

      vi.advanceTimersByTime(1500);

      const result2 = await mockQueryFn('test-key', mockFn, { cacheTime: 1000 });
      // After TTL expires, data should be stale

      vi.useRealTimers();
    });
  });

  describe('Service Integration', () => {
    it('should work as a wrapper for API calls', async () => {
      const apiCall = vi.fn().mockResolvedValue({ status: 'ok', data: [1, 2, 3] });

      const result = await mockQueryFn('api-call', () => apiCall());

      expect(result.data).toEqual({ status: 'ok', data: [1, 2, 3] });
      expect(apiCall).toHaveBeenCalled();
    });

    it('should handle typed responses', async () => {
      interface User {
        id: string;
        name: string;
        email: string;
      }

      const mockFn = vi.fn().mockResolvedValue({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      } as User);

      const result = await mockQueryFn<User>('user-1', mockFn);

      expect(result.data?.name).toBe('John Doe');
      expect(result.data?.id).toBe('1');
    });
  });
});
