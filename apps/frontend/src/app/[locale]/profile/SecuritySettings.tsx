'use client';

import { useState, type FormEvent } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface Props {
  userId: string;
  email: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const EMPTY_FORM: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function SecuritySettings({ userId, email }: Props) {
  const [form, setForm] = useState<PasswordForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const handleChange = (field: keyof PasswordForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFeedback(null);
  };

  const validate = (): string | null => {
    if (!form.currentPassword) return 'Current password is required.';
    if (form.newPassword.length < 8) return 'New password must be at least 8 characters.';
    if (form.newPassword !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFeedback({ type: 'error', message: err });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await api.post(`/users/${userId}/change-password`, {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setFeedback({ type: 'success', message: 'Password updated successfully.' });
      setForm(EMPTY_FORM);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? 'Failed to update password. Please try again.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
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

  const strength = strengthScore(form.newPassword);
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
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
              value={form.currentPassword}
              onChange={(e) => handleChange('currentPassword', e.target.value)}
              autoComplete="current-password"
              disabled={saving}
              required
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
              value={form.newPassword}
              onChange={(e) => handleChange('newPassword', e.target.value)}
              autoComplete="new-password"
              disabled={saving}
              required
              minLength={8}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
          {form.newPassword && (
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
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Minimum 8 characters; use uppercase, numbers, and symbols for a stronger password.
          </p>
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
            value={form.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            autoComplete="new-password"
            disabled={saving}
            required
            className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm
              ${form.confirmPassword && form.confirmPassword !== form.newPassword
                ? 'border-red-500'
                : 'border-gray-300 dark:border-gray-600'}`}
          />
          {form.confirmPassword && form.confirmPassword !== form.newPassword && (
            <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
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

        <Button type="submit" disabled={saving}>
          {saving ? 'Updating…' : 'Update Password'}
        </Button>
      </form>
    </section>
  );
}
