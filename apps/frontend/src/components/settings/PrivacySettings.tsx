'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function PrivacySettings() {
  const { state } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [exportReady, setExportReady] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleExport() {
    setExporting(true);
    setMessage(null);
    try {
      const { data } = await api.get('/users/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brain-storm-data-export-${state.user?.username ?? 'user'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportReady(true);
      setMessage({ type: 'success', text: 'Your data has been exported successfully.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to export data. Please try again later.' });
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    setMessage(null);
    try {
      await api.delete('/users/me');
      setMessage({ type: 'success', text: 'Account deletion request submitted. You will receive a confirmation email.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to submit deletion request. Please contact support.' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section aria-labelledby="privacy-heading" className="space-y-8">
      <div>
        <h2 id="privacy-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
          Privacy & Data
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Manage your data and account privacy settings in accordance with GDPR.
        </p>
      </div>

      {/* Data Export */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <h3 className="text-base font-medium text-gray-900 dark:text-white">Data Export</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Download all your personal data, including profile information, course progress, credentials, and activity logs.
          This export is provided in JSON format.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {exporting ? 'Preparing export...' : exportReady ? 'Export again' : 'Export My Data'}
        </button>
      </div>

      {/* Account Deletion */}
      <div className="rounded-lg border border-red-200 dark:border-red-900/50 p-5 space-y-3">
        <h3 className="text-base font-medium text-red-700 dark:text-red-400">Delete Account</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Permanently delete your account and all associated data. This action cannot be undone.
          Your credentials and certificates on the Stellar blockchain will remain due to the
          immutable nature of the ledger.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Type DELETE to confirm account deletion"
          />
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleteConfirm !== 'DELETE' || deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {deleting ? 'Processing...' : 'Delete Account'}
          </button>
        </div>
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
    </section>
  );
}
