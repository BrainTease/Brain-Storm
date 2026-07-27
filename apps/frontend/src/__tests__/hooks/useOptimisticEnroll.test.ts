import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimisticEnroll } from '@/hooks/useOptimisticEnroll';
import api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('@/lib/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('useOptimisticEnroll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows optimistic enrolled state immediately before API resolves', async () => {
    vi.mocked(api.post).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useOptimisticEnroll('course-1'));

    expect(result.current.enrolled).toBe(false);

    act(() => { result.current.enroll(); });

    expect(result.current.enrolled).toBe(true);
    expect(result.current.enrolledAt).toBeTruthy();
    expect(result.current.pending).toBe(true);
  });

  it('rolls back on API failure', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOptimisticEnroll('course-1'));

    await act(async () => {
      await result.current.enroll();
    });

    expect(result.current.enrolled).toBe(false);
    expect(result.current.enrolledAt).toBeNull();
    expect(result.current.pending).toBe(false);
  });

  it('keeps enrolled state on API success', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useOptimisticEnroll('course-1'));

    await act(async () => {
      await result.current.enroll();
    });

    expect(result.current.enrolled).toBe(true);
    expect(result.current.pending).toBe(false);
  });

  it('prevents double-click by ignoring calls while pending', async () => {
    vi.mocked(api.post).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useOptimisticEnroll('course-1'));

    act(() => { result.current.enroll(); });
    act(() => { result.current.enroll(); });

    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
