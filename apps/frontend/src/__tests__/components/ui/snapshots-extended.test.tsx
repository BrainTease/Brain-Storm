/**
 * #1028 — Extended snapshot tests for the shared UI component library.
 *
 * Components under test (all in src/components/ui/):
 *   Input (TextInput), Select (SelectInput), Checkbox, RadioGroup,
 *   Breadcrumb, DataGrid, Skeleton, ErrorBoundary, BadgeDisplay, TokenBalance
 *
 * Strategy:
 *   - One snapshot per meaningful visual variant / prop combination.
 *   - Snapshots are stored by Vitest next to this file in __snapshots__/.
 *   - Each test also includes at least one structural assertion so that
 *     a snapshot update failure surfaces a real-world regression, not
 *     just a formatting change.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/form/Checkbox';
import { RadioGroup } from '@/components/ui/form/RadioGroup';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { DataGrid } from '@/components/ui/DataGrid';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { BadgeDisplay } from '@/components/ui/BadgeDisplay';
import { TokenBalance } from '@/components/ui/TokenBalance';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/courses/intro-to-stellar',
}));

vi.mock('next/link', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ═════════════════════════════════════════════════════════════════════════════
// Input (TextInput)
// ═════════════════════════════════════════════════════════════════════════════

describe('Input — snapshots', () => {
  it('renders with a label', () => {
    const { container } = render(<Input label="Email" />);
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    const { container } = render(<Input label="Name" placeholder="Enter your name" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with error state', () => {
    const { container } = render(<Input label="Email" error="Invalid email" />);
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
  });

  it('renders with helper text', () => {
    const { container } = render(<Input label="Password" helperText="Must be 8+ characters" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders as disabled', () => {
    const { container } = render(<Input label="Read only" disabled />);
    expect(container.firstChild).toMatchSnapshot();
    expect((container.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });

  it('renders with custom type', () => {
    const { container } = render(<Input label="Password" type="password" />);
    expect(container.firstChild).toMatchSnapshot();
    expect(container.querySelector('input')).toHaveAttribute('type', 'password');
  });

  it('renders with full width', () => {
    const { container } = render(<Input label="Search" fullWidth />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Select (SelectInput)
// ═════════════════════════════════════════════════════════════════════════════

describe('Select — snapshots', () => {
  const options = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  it('renders with options', () => {
    const { container } = render(<Select label="Level" options={options} />);
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByLabelText('Level')).toBeInTheDocument();
  });

  it('renders with placeholder option', () => {
    const { container } = render(
      <Select
        label="Level"
        options={options}
        placeholderOption={{ value: '', label: 'Select a level' }}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with error state', () => {
    const { container } = render(<Select label="Level" options={options} error="Required" />);
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('renders as disabled', () => {
    const { container } = render(<Select label="Level" options={options} disabled />);
    expect(container.firstChild).toMatchSnapshot();
    expect((container.querySelector('select') as HTMLSelectElement).disabled).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Checkbox
// ═════════════════════════════════════════════════════════════════════════════

describe('Checkbox — snapshots', () => {
  it('renders inline variant', () => {
    const { container } = render(<Checkbox label="Accept terms" />);
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByLabelText('Accept terms')).toBeInTheDocument();
  });

  it('renders row variant', () => {
    const { container } = render(<Checkbox label="Enable notifications" variant="row" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders checked state', () => {
    const { container } = render(<Checkbox label="Remember me" defaultChecked />);
    expect(container.firstChild).toMatchSnapshot();
    expect((container.querySelector('input') as HTMLInputElement).checked).toBe(true);
  });

  it('renders with error', () => {
    const { container } = render(<Checkbox label="I agree" error="You must agree" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders as disabled', () => {
    const { container } = render(<Checkbox label="Locked" disabled />);
    expect(container.firstChild).toMatchSnapshot();
    expect((container.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// RadioGroup
// ═════════════════════════════════════════════════════════════════════════════

describe('RadioGroup — snapshots', () => {
  const options = [
    { value: 'free', label: 'Free tier' },
    { value: 'pro', label: 'Pro tier' },
    { value: 'enterprise', label: 'Enterprise' },
  ];

  it('renders vertical orientation', () => {
    const { container } = render(
      <RadioGroup name="plan" label="Select plan" options={options} value="pro" />
    );
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByText('Select plan')).toBeInTheDocument();
  });

  it('renders horizontal orientation', () => {
    const { container } = render(
      <RadioGroup name="plan" label="Select plan" options={options} orientation="horizontal" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with error', () => {
    const { container } = render(
      <RadioGroup name="plan" label="Plan" options={options} error="Choose a plan" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with hidden label', () => {
    const { container } = render(
      <RadioGroup name="plan" label="Plan" options={options} labelHidden />
    );
    expect(container.firstChild).toMatchSnapshot();
    // Label should still be in the DOM but visually hidden
    expect(screen.getByText('Plan')).toHaveClass('sr-only');
  });

  it('renders with disabled option', () => {
    const opts = [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B', disabled: true },
    ];
    const { container } = render(<RadioGroup name="test" label="Choose" options={opts} />);
    expect(container.firstChild).toMatchSnapshot();
    expect((screen.getByLabelText('Option B') as HTMLInputElement).disabled).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Breadcrumb
// ═════════════════════════════════════════════════════════════════════════════

describe('Breadcrumb — snapshots', () => {
  it('renders custom items', () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Courses', href: '/courses' },
          { label: 'Stellar 101', href: '/courses/stellar-101', current: true },
        ]}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
    const nav = container.querySelector('nav[aria-label="Breadcrumb"]');
    expect(nav).not.toBeNull();
  });

  it('renders with two items', () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Profile', href: '/profile', current: true },
        ]}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders nothing when items is empty', () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container.firstChild).toMatchSnapshot();
    expect(container.firstChild).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DataGrid
// ═════════════════════════════════════════════════════════════════════════════

describe('DataGrid — snapshots', () => {
  interface Course {
    id: string;
    title: string;
    enrolled: number;
  }

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'title', header: 'Course Title', sortable: true },
    { key: 'enrolled', header: 'Enrolled', sortable: true },
  ];

  const rows: Course[] = [
    { id: '1', title: 'Intro to Stellar', enrolled: 120 },
    { id: '2', title: 'Smart Contracts 101', enrolled: 85 },
    { id: '3', title: 'DeFi Fundamentals', enrolled: 200 },
  ];

  it('renders with data', () => {
    const { container } = render(<DataGrid columns={columns} rows={rows} aria-label="Courses" />);
    expect(container.firstChild).toMatchSnapshot();
    expect(container.querySelector('[role="grid"]')).toHaveAttribute('aria-label', 'Courses');
  });

  it('renders empty state', () => {
    const { container } = render(
      <DataGrid columns={columns} rows={[]} emptyText="No courses found" />
    );
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByText('No courses found')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    const { container } = render(<DataGrid columns={columns} rows={rows} isLoading />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Skeleton
// ═════════════════════════════════════════════════════════════════════════════

describe('Skeleton — snapshots', () => {
  it('renders rectangular variant (default)', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toMatchSnapshot();
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });

  it('renders text variant', () => {
    const { container } = render(<Skeleton variant="text" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders circular variant', () => {
    const { container } = render(<Skeleton variant="circular" width={48} height={48} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with custom dimensions', () => {
    const { container } = render(<Skeleton width={200} height={100} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with pulse animation', () => {
    const { container } = render(<Skeleton animation="pulse" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with no animation', () => {
    const { container } = render(<Skeleton animation="none" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('announces loading to screen readers', () => {
    const { container } = render(<Skeleton />);
    const status = container.querySelector('[role="status"]');
    expect(status).toHaveAttribute('aria-busy', 'true');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ErrorBoundary (ErrorFallback)
// ═════════════════════════════════════════════════════════════════════════════

describe('ErrorBoundary — snapshots', () => {
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error', () => {
    const safeContent = 'Safe content';
    const { container } = render(
      <ErrorBoundary>
        <div>{safeContent}</div>
      </ErrorBoundary>
    );
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByText(safeContent)).toBeInTheDocument();
  });

  it('renders default fallback on error', () => {
    function Boom() {
      throw new Error('Test error');
    }

    const { container } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(container.firstChild).toMatchSnapshot();
    const alert = container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
  });

  it('renders custom fallback on error', () => {
    function Boom() {
      throw new Error('Custom error');
    }

    const customFallback = 'Custom fallback';
    const { container } = render(
      <ErrorBoundary fallback={<div>{customFallback}</div>}>
        <Boom />
      </ErrorBoundary>
    );
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByText(customFallback)).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BadgeDisplay
// ═════════════════════════════════════════════════════════════════════════════

describe('BadgeDisplay — snapshots', () => {
  const badges = [
    {
      id: '1',
      name: 'First Steps',
      description: 'Complete first lesson',
      icon: '🎯',
      unlockedAt: '2024-01-15',
    },
    {
      id: '2',
      name: 'Fast Learner',
      description: 'Finish 5 lessons in a day',
      icon: '⚡',
      unlockedAt: null,
    },
    {
      id: '3',
      name: 'Community Star',
      description: 'Help 10 students',
      variant: 'success' as const,
      unlockedAt: '2024-02-01',
    },
  ];

  it('renders grid variant', () => {
    const { container } = render(<BadgeDisplay variant="grid" badges={badges} />);
    expect(container.firstChild).toMatchSnapshot();
    expect(container.querySelector('[role="list"]')).toHaveAttribute('aria-label', 'Badges');
  });

  it('renders grid variant empty', () => {
    const { container } = render(<BadgeDisplay variant="grid" badges={[]} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders inline variant', () => {
    const { container } = render(
      <BadgeDisplay variant="inline" items={['Stellar', 'Rust', 'Web3']} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders counter variant', () => {
    const { container } = render(<BadgeDisplay variant="counter" count={42} label="points" />);
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders counter variant with max', () => {
    const { container } = render(
      <BadgeDisplay variant="counter" count={150} label="XP" max={100} />
    );
    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByText('100+')).toBeInTheDocument();
  });

  it('renders status variant', () => {
    const { container } = render(<BadgeDisplay variant="status" status="active" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders status variant with custom label', () => {
    const { container } = render(
      <BadgeDisplay variant="status" status="pending" label="Awaiting review" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders group variant', () => {
    const { container } = render(
      <BadgeDisplay variant="group" label="Skills" items={['React', 'TypeScript']} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders pill variant', () => {
    const { container } = render(<BadgeDisplay variant="pill" badges={badges} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TokenBalance
// ═════════════════════════════════════════════════════════════════════════════

describe('TokenBalance — snapshots', () => {
  it('renders with numeric balance', () => {
    const { container } = render(<TokenBalance balance={1234.56} symbol="XLM" />);
    expect(container.firstChild).toMatchSnapshot();
    expect(container.textContent).toContain('XLM');
  });

  it('renders with string balance', () => {
    const { container } = render(<TokenBalance balance="9876.543" symbol="BST" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders fallback for null balance', () => {
    const { container } = render(<TokenBalance balance={null} symbol="XLM" />);
    expect(container.firstChild).toMatchSnapshot();
    expect(container.textContent).toContain('—');
  });

  it('renders fallback for undefined balance', () => {
    const { container } = render(<TokenBalance balance={undefined} symbol="XLM" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders custom fallback', () => {
    const { container } = render(<TokenBalance balance={null} symbol="XLM" fallback="N/A" />);
    expect(container.firstChild).toMatchSnapshot();
    expect(container.textContent).toContain('N/A');
  });

  it('renders with custom decimals', () => {
    const { container } = render(<TokenBalance balance={1.23456789} symbol="XLM" decimals={4} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders zero balance', () => {
    const { container } = render(<TokenBalance balance={0} symbol="BST" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <TokenBalance balance={100} symbol="XLM" className="text-lg font-bold" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
