'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

type ThemeOption = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeOption; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Always use light theme',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Always use dark theme',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follow your OS preference',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
];

export function AppearanceSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <section aria-labelledby="appearance-heading" className="space-y-4">
      <div>
        <h2
          id="appearance-heading"
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          Theme
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Choose how Brain-Storm looks to you. Your preference is saved locally and applied
          on every visit.{' '}
          {resolvedTheme && (
            <span className="text-xs text-blue-600 dark:text-blue-400">
              (Currently using {resolvedTheme} mode)
            </span>
          )}
        </p>
      </div>

      <div
        role="radiogroup"
        aria-labelledby="appearance-heading"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {THEME_OPTIONS.map((opt) => {
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={isActive}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800'
              }`}
            >
              <span className={isActive ? 'text-blue-600 dark:text-blue-400' : ''}>
                {opt.icon}
              </span>
              <span className="font-medium text-sm">{opt.label}</span>
              <span className="text-xs text-center opacity-75">{opt.description}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Accessibility note
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          All colour combinations in Brain-Storm meet WCAG 2.1 AA contrast requirements in both
          light and dark modes. If you experience any contrast issues, please let us know.
        </p>
      </div>
    </section>
  );
}
