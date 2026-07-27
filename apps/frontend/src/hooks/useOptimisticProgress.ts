'use client';

import { useCallback, useRef, useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/lib/toast';
import { useProgressStore } from '@/store/progress.store';

export function useOptimisticProgress(courseId: string, lessonId: string) {
  const markLesson = useProgressStore((s) => s.markLesson);
  const [pending, setPending] = useState(false);
  const rollbackRef = useRef<boolean>(false);

  const complete = useCallback(async () => {
    if (pending) return;

    const store = useProgressStore.getState();
    const existing = store.progress[courseId] ?? [];
    const lesson = existing.find((l) => l.lessonId === lessonId);
    rollbackRef.current = lesson?.completed ?? false;

    setPending(true);
    markLesson(courseId, lessonId, true);

    try {
      await api.post(`/courses/${courseId}/lessons/${lessonId}/progress`, {
        watchedSeconds: 0,
        completionPct: 100,
      });
    } catch (err: unknown) {
      store.markLesson(courseId, lessonId, rollbackRef.current);
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to save progress. Changes reverted.';
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }, [courseId, lessonId, pending, markLesson]);

  return { pending, complete };
}
