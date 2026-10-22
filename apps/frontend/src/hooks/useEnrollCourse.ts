'use client';

import { useCallback, useState } from 'react';

import api from '@/lib/api';
import { toast } from '@/lib/toast';

export type EnrollStep = 'confirm' | 'success' | 'error';

interface UseEnrollCourseOptions {
  courseId: string;
  courseTitle: string;
  onSuccess?: () => void;
}

const FALLBACK_ERROR = 'Enrollment failed. Please try again.';

/**
 * Container logic for enrolling in a course.
 *
 * Shows success optimistically, then reverts to an error step if the request
 * fails. Presentational components receive `step`, `errorMsg` and `isSubmitting`
 * and never call the API themselves.
 */
export function useEnrollCourse({ courseId, courseTitle, onSuccess }: UseEnrollCourseOptions) {
  const [step, setStep] = useState<EnrollStep>('confirm');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enroll = useCallback(async () => {
    setIsSubmitting(true);

    // Optimistic: show success immediately
    setStep('success');
    toast.success(`Enrolled in "${courseTitle}" successfully!`);
    onSuccess?.();

    try {
      await api.post(`/courses/${courseId}/enroll`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: unknown } }; message?: string };
      const msg = axiosErr?.response?.data?.message ?? axiosErr?.message ?? FALLBACK_ERROR;
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setStep('error');
      toast.error('Enrollment failed. Changes reverted.');
    } finally {
      setIsSubmitting(false);
    }
  }, [courseId, courseTitle, onSuccess]);

  const reset = useCallback(() => {
    setStep('confirm');
    setErrorMsg('');
  }, []);

  return { step, setStep, errorMsg, isSubmitting, enroll, reset };
}
