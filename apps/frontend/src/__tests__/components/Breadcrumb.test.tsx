import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Breadcrumb, CompactBreadcrumb } from '@/components/ui/Breadcrumb';

vi.mock('next/navigation', () => ({
  usePathname: () => '/courses/intro-to-stellar',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('Breadcrumb', () => {
  it('renders nothing when items list is empty', () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders custom items with proper aria-label', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Courses', href: '/courses' },
          { label: 'Intro', href: '/courses/intro', current: true },
        ]}
      />,
    );
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();
    expect(within(nav).getByText('Home')).toBeInTheDocument();
    expect(within(nav).getByText('Courses')).toBeInTheDocument();
    expect(within(nav).getByText('Intro')).toBeInTheDocument();
  });

  it('marks current page with aria-current', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Courses', href: '/courses', current: true },
        ]}
      />,
    );
    expect(screen.getByText('Courses').closest('[aria-current="page"]')).toBeTruthy();
  });

  it('auto-generates breadcrumbs from pathname when no items provided', () => {
    render(<Breadcrumb />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText(/Intro To Stellar/i)).toBeInTheDocument();
  });

  it('renders schema.org BreadcrumbList microdata', () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Courses', href: '/courses' },
        ]}
      />,
    );
    expect(
      container.querySelector('[itemtype="https://schema.org/BreadcrumbList"]'),
    ).toBeInTheDocument();
  });
});

describe('CompactBreadcrumb', () => {
  it('renders parent and current item', () => {
    render(
      <CompactBreadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Courses', href: '/courses' },
          { label: 'Intro', href: '/courses/intro', current: true },
        ]}
      />,
    );
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Intro')).toBeInTheDocument();
  });

  it('renders nothing for a single-item list', () => {
    const { container } = render(
      <CompactBreadcrumb items={[{ label: 'Home', href: '/' }]} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
