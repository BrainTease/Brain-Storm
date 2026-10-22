import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEnrollCourse } from '@/hooks/useEnrollCourse';

vi.mock('@/lib/api', () => ({
  default: { post: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import api from '@/lib/api';
import { toast } from '@/lib/toast';

const mockPost = api.post as unknown as ReturnType<typeof vi.fn>;

const options = { courseId: 'c1', courseTitle: 'Stellar Basics' };

describe('useEnrollCourse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts on the confirm step with no error', () => {
    const { result } = renderHook(() => useEnrollCourse(options));

    expect(result.current.step).toBe('confirm');
    expect(result.current.errorMsg).toBe('');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('posts to the enroll endpoint and moves to success', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useEnrollCourse({ ...options, onSuccess }));

    await act(async () => {
      await result.current.enroll();
    });

    expect(mockPost).toHaveBeenCalledWith('/courses/c1/enroll');
    expect(result.current.step).toBe('success');
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Enrolled in "Stellar Basics" successfully!');
  });

  it('reverts to the error step with the server message when the request fails', async () => {
    mockPost.mockRejectedValueOnce({ response: { data: { message: 'Already enrolled' } } });
    const { result } = renderHook(() => useEnrollCourse(options));

    await act(async () => {
      await result.current.enroll();
    });

    expect(result.current.step).toBe('error');
    expect(result.current.errorMsg).toBe('Already enrolled');
    expect(toast.error).toHaveBeenCalledWith('Enrollment failed. Changes reverted.');
  });

  it('falls back to the generic message when the error has no detail', async () => {
    mockPost.mockRejectedValueOnce({});
    const { result } = renderHook(() => useEnrollCourse(options));

    await act(async () => {
      await result.current.enroll();
    });

    expect(result.current.errorMsg).toBe('Enrollment failed. Please try again.');
  });

  it('reset returns to the confirm step and clears the error', async () => {
    mockPost.mockRejectedValueOnce({ message: 'Boom' });
    const { result } = renderHook(() => useEnrollCourse(options));

    await act(async () => {
      await result.current.enroll();
    });
    act(() => result.current.reset());

    expect(result.current.step).toBe('confirm');
    expect(result.current.errorMsg).toBe('');
  });
});
