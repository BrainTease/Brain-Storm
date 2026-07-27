import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPathname = vi.fn(() => '/');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, onClick, ...props }: any) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

// Mock navigator.vibrate
beforeEach(() => {
  Object.defineProperty(navigator, 'vibrate', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
  mockPathname.mockReturnValue('/');
});

import { BottomMobileNav } from '@/components/layout/MobileNav';

describe('BottomMobileNav', () => {
  it('renders 4 nav items', () => {
    render(<BottomMobileNav />);
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('sets aria-current="page" on the active item matching pathname', () => {
    mockPathname.mockReturnValue('/courses');
    render(<BottomMobileNav />);
    const coursesLink = screen.getByRole('link', { name: /courses/i });
    expect(coursesLink).toHaveAttribute('aria-current', 'page');
  });

  it('does not set aria-current on inactive items', () => {
    mockPathname.mockReturnValue('/courses');
    render(<BottomMobileNav />);
    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).not.toHaveAttribute('aria-current');
  });

  it('links have correct href values', () => {
    render(<BottomMobileNav />);
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /courses/i })).toHaveAttribute('href', '/courses');
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/profile');
  });

  it('calls navigator.vibrate(10) when a nav item is clicked', async () => {
    const user = userEvent.setup();
    render(<BottomMobileNav />);
    await user.click(screen.getByRole('link', { name: /home/i }));
    expect(navigator.vibrate).toHaveBeenCalledWith(10);
  });

  it('renders the nav element with safe-area padding style', () => {
    const { container } = render(<BottomMobileNav />);
    const nav = container.querySelector('nav');
    expect(nav?.style.paddingBottom).toBe('env(safe-area-inset-bottom, 0px)');
  });
});
