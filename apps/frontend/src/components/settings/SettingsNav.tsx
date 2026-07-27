'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

const SECTIONS = [
  { id: 'account', label: 'Account', icon: '👤' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'privacy', label: 'Privacy & Data', icon: '🔒' },
] as const;

export function SettingsNav() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const active = searchParams.get('section') || 'account';

  const setSection = useCallback(
    (section: string) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set('section', section);
      router.push(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  return (
    <nav className="w-56 shrink-0 space-y-1" aria-label="Settings sections">
      {SECTIONS.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setSection(id)}
          aria-current={active === id ? 'true' : undefined}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-colors
            ${active === id
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
          <span className="text-lg">{icon}</span>
          {label}
        </button>
      ))}
    </nav>
  );
}
