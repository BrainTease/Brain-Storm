'use client';

import { useCallback, useRef, useState } from 'react';
import api from '@/lib/api';
import { toast } from '@/lib/toast';

interface EnrollmentState {
  enrolled: boolean;
  enrolledAt: string | null;
}

export function useOptimisticEnroll(courseId: string, initialEnrolled = false) {
  const [state, setState] = useState<EnrollmentState>({
    enrolled: initialEnrolled,
    enrolledAt: initialEnrolled ? new Date().toISOString() : null,
  });
  const [pending, setPending] = useState(false);
  const rollbackRef = useRef<EnrollmentState>(state);

  const enroll = useCallback(async () => {
    if (pending) return;
    rollbackRef.current = state;
    setPending(true);

    const optimistic: EnrollmentState = {
      enrolled: true,
      enrolledAt: new Date().toISOString(),
    };
    setState(optimistic);

    try {
      await api.post(`/courses/${courseId}/enroll`);
      toast.success('Enrolled successfully!');
    } catch (err: unknown) {
      setState(rollbackRef.current);
      const msg =
        err instanceof Error ? err.message : 'Enrollment failed. Changes reverted.';
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }, [courseId, pending, state]);

  const reset = useCallback(() => {
    setState({ enrolled: false, enrolledAt: null });
  }, []);

  return { ...state, pending, enroll, reset };
}
