import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimisticProgress } from '@/hooks/useOptimisticProgress';
import { useProgressStore } from '@/store/progress.store';
import api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('@/lib/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('useOptimisticProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProgressStore.getState().reset();
  });

  it('marks lesson completed optimistically', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useOptimisticProgress('course-1', 'lesson-1'));

    await act(async () => {
      await result.current.complete();
    });

    const state = useProgressStore.getState();
    const lessons = state.progress['course-1'];
    expect(lessons).toBeDefined();
    expect(lessons![0].lessonId).toBe('lesson-1');
    expect(lessons![0].completed).toBe(true);
  });

  it('rolls back on API failure', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useOptimisticProgress('course-1', 'lesson-1'));

    await act(async () => {
      await result.current.complete();
    });

    const state = useProgressStore.getState();
    const lessons = state.progress['course-1'];
    expect(lessons).toBeUndefined();
  });
});
