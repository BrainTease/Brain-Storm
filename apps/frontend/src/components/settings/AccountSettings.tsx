'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { TextInput } from '@/components/ui/form';

export function AccountSettings() {
  const { user, setUser } = useAuth();
  const [username, setUsername] = useState(user?.username ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const { data } = await api.patch('/users/me', { username });
      setUser(data);
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
        <TextInput
          id="settings-email"
          label="Email"
          type="email"
          value={user?.email ?? ''}
          disabled
          readOnly
          helperText="Email cannot be changed. Contact support for assistance."
        />

        <TextInput
          id="settings-username"
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          maxLength={30}
        />

        <TextInput
          id="settings-role"
          label="Role"
          value={user?.role ?? ''}
          disabled
          readOnly
        />

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
