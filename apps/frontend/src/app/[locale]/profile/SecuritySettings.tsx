'use client';

import { useState } from 'react';
import { z } from 'zod';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useZodForm } from '@/components/forms';

interface Props {
  userId: string;
  email: string;
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

type PasswordForm = z.infer<typeof passwordSchema>;

const EMPTY_FORM: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function SecuritySettings({ userId, email }: Props) {
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useZodForm<PasswordForm>({
    schema: passwordSchema,
    defaultValues: EMPTY_FORM,
  });

  const newPassword = watch('newPassword');
  const clearFeedback = () => setFeedback(null);

  const onSubmit = async (values: PasswordForm) => {
    setFeedback(null);
    try {
      await api.post(`/users/${userId}/change-password`, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setFeedback({ type: 'success', message: 'Password updated successfully.' });
      reset(EMPTY_FORM);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? 'Failed to update password. Please try again.';
      setFeedback({ type: 'error', message: msg });
    }
  };

  const strengthScore = (pw: string): number => {
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0–5
  };

  const strength = strengthScore(newPassword || '');
  const strengthLabel = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][strength] || '';
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'][strength] || '';

  return (
    <section
      aria-labelledby="security-heading"
      className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-5 bg-white dark:bg-gray-900"
    >
      <h2 id="security-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
        Account Security
      </h2>

      {/* Account email (read-only info) */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Account email</p>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{email}</p>
      </div>

      {/* Change password form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Change Password
        </h3>

        {/* Current password */}
        <div>
          <label
            htmlFor="current-password"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
          >
            Current Password
          </label>
          <div className="relative">
            <input
              id="current-password"
              type={showCurrentPw ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isSubmitting}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              {...register('currentPassword', { onChange: clearFeedback })}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPw((v) => !v)}
              aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              {showCurrentPw ? '🙈' : '👁️'}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.currentPassword.message}</p>
          )}
        </div>

        {/* New password */}
        <div>
          <label
            htmlFor="new-password"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
          >
            New Password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showNewPw ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={isSubmitting}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              {...register('newPassword', { onChange: clearFeedback })}
            />
            <button
              type="button"
              onClick={() => setShowNewPw((v) => !v)}
              aria-label={showNewPw ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              {showNewPw ? '🙈' : '👁️'}
            </button>
          </div>
          {/* Strength bar */}
          {newPassword && (
            <div className="mt-1 space-y-0.5">
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${strengthColor}`}
                  style={{ width: `${(strength / 5) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{strengthLabel}</p>
            </div>
          )}
          {errors.newPassword ? (
            <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Minimum 8 characters; use uppercase, numbers, and symbols for a stronger password.
            </p>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label
            htmlFor="confirm-password"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
          >
            Confirm New Password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            disabled={isSubmitting}
            className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm
              ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            {...register('confirmPassword', { onChange: clearFeedback })}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            role="alert"
            className={`rounded-lg p-3 text-sm ${
              feedback.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Updating…' : 'Update Password'}
        </Button>
      </form>
    </section>
  );
}
