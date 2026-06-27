'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { toast } from '@/lib/toast';

const schema = z.object({
  agreedToTerms: z.boolean().refine((v) => v === true, 'You must agree to the terms'),
});

type FormValues = z.infer<typeof schema>;

export interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  price?: number;
  onSuccess?: () => void;
}

type Step = 'confirm' | 'success' | 'error';

export function EnrollmentModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  price,
  onSuccess,
}: EnrollmentModalProps) {
  const [step, setStep] = useState<Step>('confirm');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function handleClose() {
    reset();
    setStep('confirm');
    setErrorMsg('');
    onClose();
  }

  const onSubmit = useCallback(async () => {
    setIsSubmitting(true);

    // Optimistic: show success immediately
    setStep('success');
    toast.success(`Enrolled in "${courseTitle}" successfully!`);
    onSuccess?.();

    try {
      await api.post(`/courses/${courseId}/enroll`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? err?.message ?? 'Enrollment failed. Please try again.';
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setStep('error');
      toast.error('Enrollment failed. Changes reverted.');
    } finally {
      setIsSubmitting(false);
    }
  }, [courseId, courseTitle, onSuccess]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Enroll in Course">
      {step === 'confirm' && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <p className="text-gray-700 dark:text-gray-300 font-medium">{courseTitle}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {price ? `Price: $${price.toFixed(2)}` : 'This course is free'}
            </p>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('agreedToTerms')}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              aria-describedby={errors.agreedToTerms ? 'terms-error' : undefined}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I agree to the{' '}
              <a href="/terms" className="text-blue-600 underline" target="_blank" rel="noreferrer">
                terms and conditions
              </a>
            </span>
          </label>
          {errors.agreedToTerms && (
            <p id="terms-error" role="alert" className="text-sm text-red-600">
              {errors.agreedToTerms.message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-2">
              {isSubmitting && <Spinner size="sm" />}
              {isSubmitting ? 'Enrolling…' : 'Confirm Enrollment'}
            </Button>
          </div>
        </form>
      )}

      {step === 'success' && (
        <div className="text-center space-y-4" role="status">
          <div className="text-5xl" aria-hidden="true">🎉</div>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            You&apos;re enrolled!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You can now access <strong>{courseTitle}</strong> from your dashboard.
          </p>
          <Button onClick={handleClose} className="w-full">
            Go to Dashboard
          </Button>
        </div>
      )}

      {step === 'error' && (
        <div className="space-y-4" role="alert">
          <p className="text-red-600 dark:text-red-400 font-medium">Enrollment failed</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{errorMsg}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('confirm')} className="flex-1">
              Try Again
            </Button>
            <Button onClick={handleClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
