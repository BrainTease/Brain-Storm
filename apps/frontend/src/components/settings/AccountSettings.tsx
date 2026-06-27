'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';

export function AccountSettings() {
  const { state, dispatch } = useAuth();
  const [username, setUsername] = useState(state.user?.username ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const { data } = await api.patch('/users/me', { username });
      dispatch({ type: 'SET_USER', payload: data });
      setMessage({ type: 'success', text: 'Account updated successfully.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to update account. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="account-heading" className="space-y-6">
      <div>
        <h2 id="account-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
          Account
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Manage your profile details and email address.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="settings-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            id="settings-email"
            type="email"
            value={state.user?.email ?? ''}
            disabled
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            aria-describedby="email-disabled-note"
          />
          <p id="email-disabled-note" className="text-xs text-gray-400 mt-1">
            Email cannot be changed. Contact support for assistance.
          </p>
        </div>

        <div>
          <label htmlFor="settings-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Username
          </label>
          <input
            id="settings-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={30}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="settings-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Role
          </label>
          <input
            id="settings-role"
            type="text"
            value={state.user?.role ?? ''}
            disabled
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
        </div>

        {message && (
          <div
            role="alert"
            className={`text-sm px-3 py-2 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </section>
  );
}
