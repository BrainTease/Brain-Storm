'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuthStore } from '@/store/auth.store';

const WalletButton = dynamic(
  () => import('@/components/wallet/WalletButton').then((m) => ({ default: m.WalletButton })),
  {
    ssr: false,
    loading: () => (
      <div className="w-28 h-9 rounded-lg animate-pulse bg-gray-200 dark:bg-gray-700" />
    ),
  }
);

export interface NavLinkDefinition {
  href: string;
  label: string;
  requiresAuth: boolean;
}

export const NAV_LINK_DEFINITIONS: NavLinkDefinition[] = [
  { href: '/courses', label: 'Courses', requiresAuth: false },
  { href: '/dashboard', label: 'Dashboard', requiresAuth: true },
  { href: '/leaderboard', label: 'Leaderboard', requiresAuth: false },
  { href: '/cohorts', label: 'Cohorts', requiresAuth: true },
];

const ACTIVE_LINK_CLASS = 'text-blue-600 dark:text-blue-400 font-semibold';
const INACTIVE_LINK_CLASS =
  'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white';

export function isLinkActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.endsWith(href);
}

export function getLinkClassName(pathname: string, href: string): string {
  return isLinkActive(pathname, href) ? ACTIVE_LINK_CLASS : INACTIVE_LINK_CLASS;
}

export function getVisibleNavLinks(isAuthenticated: boolean): NavLinkDefinition[] {
  return NAV_LINK_DEFINITIONS.filter((link) => !link.requiresAuth || isAuthenticated);
}

export function Navbar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = Boolean(user && token);

  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const links = getVisibleNavLinks(isAuthenticated);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <nav
      aria-label="Site navigation"
      className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors relative z-40"
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-gray-900 dark:text-white">
          Brain-Storm
        </Link>

        <div className="hidden sm:flex items-center gap-4">
          <ul className="flex items-center gap-4">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={getLinkClassName(pathname, link.href)}
                  aria-current={isLinkActive(pathname, link.href) ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <LanguageSwitcher />
          <ThemeToggle />
          <WalletButton />
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <NotificationBell />
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  aria-label="User menu"
                  aria-haspopup="menu"
                  aria-expanded={dropdownOpen}
                  onClick={() => setDropdownOpen((open) => !open)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
                >
                  {user.username.charAt(0).toUpperCase()}
                </button>
                {dropdownOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                  >
                    <Link
                      href="/profile"
                      role="menuitem"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Login
            </Link>
          )}
        </div>

        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="sm:hidden p-2 text-gray-600 dark:text-gray-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
            />
          </svg>
        </button>
      </div>

      {menuOpen ? (
        <div className="sm:hidden border-t border-gray-200 px-6 py-3 dark:border-gray-700">
          <ul className="flex flex-col gap-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={getLinkClassName(pathname, link.href)}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {isAuthenticated ? (
              <li>
                <button
                  type="button"
                  className="text-sm text-gray-600 dark:text-gray-300"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                >
                  Logout
                </button>
              </li>
            ) : (
              <li>
                <Link
                  href="/auth/login"
                  className={INACTIVE_LINK_CLASS}
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
              </li>
            )}
          </ul>
        </div>
      ) : null}
    </nav>
  );
}

export default Navbar;
