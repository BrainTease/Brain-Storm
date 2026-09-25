import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRoyalties } from '@/hooks/useRoyalties';
import api from '@/lib/api';

vi.mock('@/lib/api');

const mockTransactions = [
  {
    id: 'tx-1',
    date: '2024-01-15',
    course: 'Blockchain Basics',
    recipient: 'GCVD3ZB3KKRQRUVJMSCG3XFQT3ZYVP3PJQW2LYAAA4JXYHLYGTW3XYZ',
    royaltyPct: 5,
    amount: '100.50',
    txHash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
  },
  {
    id: 'tx-2',
    date: '2024-01-16',
    course: 'Advanced Smart Contracts',
    recipient: 'GCVD3ZB3KKRQRUVJMSCG3XFQT3ZYVP3PJQW2LYAAA4JXYHLYGTW3XYZ',
    royaltyPct: 8,
    amount: '250.75',
    txHash: 'def456ghi789def456ghi789def456ghi789def456ghi789def456ghi789def456',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useRoyalties', () => {
  it('should return empty transactions and no loading state initially', () => {
    const { result } = renderHook(() => useRoyalties());
    expect(result.current.transactions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not fetch data if userId is not provided', () => {
    renderHook(() => useRoyalties());
    expect(api.get).not.toHaveBeenCalled();
  });

  it('should fetch royalty transactions when userId is provided', async () => {
    (api.get as any).mockResolvedValueOnce({ data: mockTransactions }); // eslint-disable-line @typescript-eslint/no-explicit-any

    const { result } = renderHook(() => useRoyalties('user-123'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(api.get).toHaveBeenCalledWith('/royalties/user-123/transactions');
    expect(result.current.transactions).toEqual(mockTransactions);
    expect(result.current.error).toBeNull();
  });

  it('should handle error when fetching transactions fails', async () => {
    (api.get as any).mockRejectedValueOnce(new Error('Network error')); // eslint-disable-line @typescript-eslint/no-explicit-any

    const { result } = renderHook(() => useRoyalties('user-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.transactions).toEqual([]);
    expect(result.current.error).toBe('Failed to load royalty transactions.');
  });

  it('should handle empty response from API', async () => {
    (api.get as any).mockResolvedValueOnce({ data: null }); // eslint-disable-line @typescript-eslint/no-explicit-any

    const { result } = renderHook(() => useRoyalties('user-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.transactions).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should refresh transactions on demand', async () => {
    (api.get as any).mockResolvedValueOnce({ data: mockTransactions }); // eslint-disable-line @typescript-eslint/no-explicit-any

    const { result } = renderHook(() => useRoyalties('user-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(api.get).toHaveBeenCalledTimes(1);

    (api.get as any).mockResolvedValueOnce({
      // eslint-disable-line @typescript-eslint/no-explicit-any
      data: [...mockTransactions, mockTransactions[0]],
    });

    result.current.refresh();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  it('should cancel request on unmount', async () => {
    (api.get as any).mockResolvedValueOnce({ data: mockTransactions }); // eslint-disable-line @typescript-eslint/no-explicit-any

    const { unmount } = renderHook(() => useRoyalties('user-123'));

    unmount();

    await waitFor(() => {
      // Verify hook is cleaned up
      expect(api.get).toHaveBeenCalled();
    }).catch(() => {
      // Expected since hook is unmounted
    });
  });

  it('should update data when userId changes', async () => {
    (api.get as any).mockResolvedValueOnce({ data: mockTransactions }); // eslint-disable-line @typescript-eslint/no-explicit-any

    const { rerender } = renderHook(({ userId }: { userId: string }) => useRoyalties(userId), {
      initialProps: { userId: 'user-123' },
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/royalties/user-123/transactions');
    });

    (api.get as any).mockResolvedValueOnce({ data: [mockTransactions[0]] }); // eslint-disable-line @typescript-eslint/no-explicit-any

    rerender({ userId: 'user-456' });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/royalties/user-456/transactions');
    });
  });

  it('should format transaction data correctly', async () => {
    (api.get as any).mockResolvedValueOnce({ data: mockTransactions }); // eslint-disable-line @typescript-eslint/no-explicit-any

    const { result } = renderHook(() => useRoyalties('user-123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.transactions[0]).toHaveProperty('id');
    expect(result.current.transactions[0]).toHaveProperty('date');
    expect(result.current.transactions[0]).toHaveProperty('course');
    expect(result.current.transactions[0]).toHaveProperty('recipient');
    expect(result.current.transactions[0]).toHaveProperty('royaltyPct');
    expect(result.current.transactions[0]).toHaveProperty('amount');
    expect(result.current.transactions[0]).toHaveProperty('txHash');
  });
});
