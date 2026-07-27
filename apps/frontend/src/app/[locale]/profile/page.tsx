'use client';

import { useEffect, useState, useCallback, useRef, type FormEvent, type ChangeEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import WalletSection from './WalletSection';
import ReferralSection from './ReferralSection';
import NotificationPreferences from './NotificationPreferences';
import LearningStats from './LearningStats';
import SecuritySettings from './SecuritySettings';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useBookmarksStore } from '@/store/bookmarks.store';

interface User {
  id: string;
  username: string;
  email: string;
  bio: string;
  role: string;
  avatarUrl: string;
  createdAt: string;
  stellarPublicKey?: string;
  referralCode?: string;
}

interface FormData {
  username: string;
  bio: string;
  avatarUrl: string;
}

type ActiveTab = 'profile' | 'stats' | 'notifications' | 'security';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormData>({ username: '', bio: '', avatarUrl: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { bookmarks, fetchBookmarks } = useBookmarksStore();

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/users/me');
        setUser(response.data);
        setForm({
          username: response.data.username,
          bio: response.data.bio ?? '',
          avatarUrl: response.data.avatarUrl ?? '',
        });
      } catch (err) {
        setError(t('loadError'));
        console.error('Failed to fetch user:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [t]);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  /* ── Save profile ── */
  const handleSave = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!user) return;
      if (!form.username.trim()) {
        setError(t('usernameRequired'));
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const { data } = await api.patch(`/users/${user.id}`, form);
        setUser({ ...user, ...data });
        setSaved(true);
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        setError(t('saveError'));
        console.error('Failed to save profile:', err);
      } finally {
        setSaving(false);
      }
    },
    [user, form, t]
  );

  /* ── Avatar upload ── */
  const handleAvatarUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      // Client-side size guard (5 MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Avatar file must be smaller than 5 MB.');
        return;
      }

      setAvatarUploading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append('avatar', file);
        const { data } = await api.post(`/users/${user.id}/avatar`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const newUrl: string = data.avatarUrl ?? data.url ?? '';
        setUser((prev) => (prev ? { ...prev, avatarUrl: newUrl } : prev));
        setForm((prev) => ({ ...prev, avatarUrl: newUrl }));
      } catch (err) {
        setError('Failed to upload avatar. Please try again.');
        console.error('Avatar upload failed:', err);
      } finally {
        setAvatarUploading(false);
        // Reset file input so the same file can be re-selected
        if (avatarInputRef.current) avatarInputRef.current.value = '';
      }
    },
    [user]
  );

  const handleFormChange = useCallback(
    (field: keyof FormData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (error) setError(null);
    },
    [error]
  );

  const onWalletLinked = useCallback((key: string) => {
    setUser((prev) => (prev ? { ...prev, stellarPublicKey: key } : null));
  }, []);

  const onWalletUnlinked = useCallback(() => {
    setUser((prev) => (prev ? { ...prev, stellarPublicKey: undefined } : null));
  }, []);

  /* ── Loading / error states ── */
  if (loading) {
    return (
      <main className="max-w-2xl mx-auto p-8 text-gray-900 dark:text-gray-100">
        <p role="status" aria-live="polite">{t('loading')}</p>
      </main>
    );
  }

  if (error && !user) {
    return (
      <main className="max-w-2xl mx-auto p-8 text-gray-900 dark:text-gray-100">
        <div
          role="alert"
          className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
            {t('retry')}
          </Button>
        </div>
      </main>
    );
  }

  if (!user) return null;

  const joinedDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(user.createdAt)
  );
  const initial = user.username[0]?.toUpperCase() ?? '?';

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'profile',       label: '👤 Profile' },
    { key: 'stats',         label: '📊 Stats' },
    { key: 'notifications', label: '🔔 Notifications' },
    { key: 'security',      label: '🔒 Security' },
  ];

  return (
    <ProtectedRoute>
      <main className="max-w-2xl mx-auto p-8 space-y-8">

        {/* ── User header ── */}
        <div className="flex items-center gap-5">
          {/* Avatar with upload overlay */}
          <div className="relative group">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={t('avatarAlt', { name: user.username })}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-blue-200 dark:ring-blue-800"
                priority
              />
            ) : (
              <div
                aria-hidden="true"
                className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-3xl font-bold text-blue-700 dark:text-blue-300 select-none ring-2 ring-blue-200 dark:ring-blue-800"
              >
                {initial}
              </div>
            )}

            {/* Upload overlay */}
            <label
              htmlFor="avatar-upload"
              title={t('uploadAvatar')}
              className="absolute inset-0 flex items-center justify-center rounded-full cursor-pointer
                bg-black/0 group-hover:bg-black/40 transition-all"
            >
              <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity select-none">
                {avatarUploading ? '⏳' : '📷'}
              </span>
            </label>
            <input
              id="avatar-upload"
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarUpload}
              disabled={avatarUploading}
              className="sr-only"
              aria-label={t('uploadAvatar')}
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.username}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {user.email} · {user.role} · {t('joined', { date: joinedDate })}
            </p>
            <div className="mt-2">
              <Link
                href="/bookmarks"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <svg className="w-4 h-4 fill-blue-500" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {bookmarks.length} Bookmarked Course{bookmarks.length !== 1 ? 's' : ''}
              </Link>
            </div>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <nav
          role="tablist"
          aria-label="Profile sections"
          className="flex gap-1 border-b border-gray-200 dark:border-gray-700"
        >
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
                ${activeTab === key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* ── Error banner ── */}
        {error && (
          <div
            role="alert"
            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* ════════ PROFILE TAB ════════ */}
        {activeTab === 'profile' && (
          <div className="space-y-8">
            {/* Edit form */}
            <form onSubmit={handleSave} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('editProfile')}
              </h2>

              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
                >
                  {t('username')}
                </label>
                <input
                  id="username"
                  type="text"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.username}
                  onChange={(e) => handleFormChange('username', e.target.value)}
                  disabled={saving}
                  required
                  maxLength={50}
                  aria-describedby="username-hint"
                />
                <p id="username-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('usernameHint')}
                </p>
              </div>

              <div>
                <label
                  htmlFor="bio"
                  className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
                >
                  {t('bio')}
                </label>
                <textarea
                  id="bio"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={form.bio}
                  onChange={(e) => handleFormChange('bio', e.target.value)}
                  disabled={saving}
                  maxLength={500}
                  aria-describedby="bio-hint"
                />
                <p id="bio-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('bioHint', { count: form.bio.length })}
                </p>
              </div>

              <div>
                <label
                  htmlFor="avatarUrl"
                  className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
                >
                  {t('avatarUrl')}
                </label>
                <input
                  id="avatarUrl"
                  type="url"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.avatarUrl}
                  onChange={(e) => handleFormChange('avatarUrl', e.target.value)}
                  disabled={saving}
                  placeholder="https://example.com/avatar.jpg"
                  aria-describedby="avatar-hint"
                />
                <p id="avatar-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('avatarUrlHint')}
                </p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  Or hover your avatar photo above to upload a new image (JPEG / PNG / WebP, max 5 MB).
                </p>
              </div>

              <div aria-live="polite" aria-atomic="true" className="sr-only">
                {saved ? t('saved') : ''}
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? t('saving') : saved ? t('saved') : t('saveChanges')}
              </Button>
            </form>

            {/* Wallet */}
            <WalletSection
              userId={user.id}
              stellarPublicKey={user.stellarPublicKey}
              onLinked={onWalletLinked}
              onUnlinked={onWalletUnlinked}
            />

            {/* Referral */}
            {user.referralCode && (
              <ReferralSection userId={user.id} referralCode={user.referralCode} />
            )}
          </div>
        )}

        {/* ════════ STATS TAB ════════ */}
        {activeTab === 'stats' && <LearningStats userId={user.id} />}

        {/* ════════ NOTIFICATIONS TAB ════════ */}
        {activeTab === 'notifications' && <NotificationPreferences userId={user.id} />}

        {/* ════════ SECURITY TAB ════════ */}
        {activeTab === 'security' && (
          <SecuritySettings userId={user.id} email={user.email} />
        )}
      </main>
    </ProtectedRoute>
  );
}
