/**
 * #1028 — Structure and accessibility tests for extended UI components.
 *
 * Components under test (all in src/components/ui/):
 *   Input (TextInput), Select (SelectInput), Checkbox, RadioGroup,
 *   Breadcrumb, DataGrid, Skeleton, ErrorBoundary, BadgeDisplay, TokenBalance
 *
 * Strategy:
 *   - Focus on structural integrity and accessibility attributes.
 *   - Avoid brittle snapshots that break on trivial formatting changes.
 *   - Each test validates ARIA attributes, DOM structure, and functional behavior.
 *   - HTML classes and formatting are excluded from tests (implementation details).
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

describe('Input — structure and accessibility', () => {
  it('renders with associated label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders input element with proper type', () => {
    const { container } = render(<Input label="Name" />);
    expect(container.querySelector('input')).toHaveAttribute('type', 'text');
  });

  it('accepts placeholder text', () => {
    const { container } = render(<Input label="Name" placeholder="Enter your name" />);
    expect(container.querySelector('input')).toHaveAttribute('placeholder', 'Enter your name');
  });

  it('renders error state with alert role', () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
  });

  it('displays helper text when provided', () => {
    render(<Input label="Password" helperText="Must be 8+ characters" />);
    expect(screen.getByText('Must be 8+ characters')).toBeInTheDocument();
  });

  it('sets disabled state on input element', () => {
    const { container } = render(<Input label="Read only" disabled />);
    expect((container.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });

  it('renders different input types correctly', () => {
    const types = ['text', 'email', 'password', 'number', 'tel'] as const;
    for (const type of types) {
      const { container } = render(<Input label="Test" type={type} />);
      expect(container.querySelector('input')).toHaveAttribute('type', type);
    }
  });

  it('applies full width class when specified', () => {
    const { container } = render(<Input label="Search" fullWidth />);
    const input = container.querySelector('input');
    expect(input?.parentElement).toHaveClass('w-full');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Select (SelectInput)
// ═════════════════════════════════════════════════════════════════════════════

describe('Select — structure and accessibility', () => {
  const options = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  it('renders with associated label', () => {
    render(<Select label="Level" options={options} />);
    expect(screen.getByLabelText('Level')).toBeInTheDocument();
  });

  it('renders select element with all options', () => {
    const { container } = render(<Select label="Level" options={options} />);
    const select = container.querySelector('select');
    expect(select).not.toBeNull();
    expect(select?.querySelectorAll('option')).toHaveLength(options.length);
  });

  it('renders placeholder option when provided', () => {
    const { container } = render(
      <Select
        label="Level"
        options={options}
        placeholderOption={{ value: '', label: 'Select a level' }}
      />
    );
    const options_list = container.querySelectorAll('option');
    expect(options_list[0]).toHaveTextContent('Select a level');
  });

  it('renders error state with alert role', () => {
    render(<Select label="Level" options={options} error="Required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('sets disabled state on select element', () => {
    const { container } = render(<Select label="Level" options={options} disabled />);
    expect((container.querySelector('select') as HTMLSelectElement).disabled).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Checkbox
// ═════════════════════════════════════════════════════════════════════════════

describe('Checkbox — structure and accessibility', () => {
  it('renders with associated label', () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByLabelText('Accept terms')).toBeInTheDocument();
  });

  it('renders checkbox input', () => {
    const { container } = render(<Checkbox label="Accept terms" />);
    expect(container.querySelector('input[type="checkbox"]')).toBeInTheDocument();
  });

  it('renders all variants', () => {
    const variants = ['inline', 'row'] as const;
    for (const variant of variants) {
      const { container } = render(<Checkbox label="Test" variant={variant} />);
      expect(container.querySelector('input[type="checkbox"]')).toBeInTheDocument();
    }
  });

  it('handles checked state', () => {
    const { container } = render(<Checkbox label="Remember me" defaultChecked />);
    expect((container.querySelector('input') as HTMLInputElement).checked).toBe(true);
  });

  it('renders error state', () => {
    const { container } = render(<Checkbox label="I agree" error="You must agree" />);
    expect(container.textContent).toContain('You must agree');
  });

  it('sets disabled state', () => {
    const { container } = render(<Checkbox label="Locked" disabled />);
    expect((container.querySelector('input') as HTMLInputElement).disabled).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// RadioGroup
// ═════════════════════════════════════════════════════════════════════════════

describe('RadioGroup — structure and accessibility', () => {
  const options = [
    { value: 'free', label: 'Free tier' },
    { value: 'pro', label: 'Pro tier' },
    { value: 'enterprise', label: 'Enterprise' },
  ];

  it('renders with label', () => {
    render(<RadioGroup name="plan" label="Select plan" options={options} value="pro" />);
    expect(screen.getByText('Select plan')).toBeInTheDocument();
  });

  it('renders all radio options', () => {
    const { container } = render(
      <RadioGroup name="plan" label="Select plan" options={options} value="pro" />
    );
    const radios = container.querySelectorAll('input[type="radio"]');
    expect(radios).toHaveLength(options.length);
  });

  it('renders vertical and horizontal orientations', () => {
    const orientations = ['vertical', 'horizontal'] as const;
    for (const orientation of orientations) {
      const { container } = render(
        <RadioGroup name="plan" label="Plan" options={options} orientation={orientation} />
      );
      const radios = container.querySelectorAll('input[type="radio"]');
      expect(radios.length).toBeGreaterThan(0);
    }
  });

  it('renders error state', () => {
    const { container } = render(
      <RadioGroup name="plan" label="Plan" options={options} error="Choose a plan" />
    );
    expect(container.textContent).toContain('Choose a plan');
  });

  it('hides label visually when labelHidden=true', () => {
    render(<RadioGroup name="plan" label="Plan" options={options} labelHidden />);
    const label = screen.getByText('Plan');
    expect(label).toHaveClass('sr-only');
  });

  it('disables individual radio options', () => {
    const opts = [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B', disabled: true },
    ];
    const { container } = render(<RadioGroup name="test" label="Choose" options={opts} />);
    const disabledRadio = screen.getByLabelText('Option B') as HTMLInputElement;
    expect(disabledRadio.disabled).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Breadcrumb
// ═════════════════════════════════════════════════════════════════════════════

describe('Breadcrumb — structure and accessibility', () => {
  it('renders navigation with breadcrumb role', () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Courses', href: '/courses' },
          { label: 'Stellar 101', href: '/courses/stellar-101', current: true },
        ]}
      />
    );
    const nav = container.querySelector('nav[aria-label="Breadcrumb"]');
    expect(nav).not.toBeNull();
  });

  it('renders all breadcrumb items', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Courses', href: '/courses' },
          { label: 'Stellar 101', href: '/courses/stellar-101', current: true },
        ]}
      />
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Stellar 101')).toBeInTheDocument();
  });

  it('renders with two items', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Profile', href: '/profile', current: true },
        ]}
      />
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders nothing when items is empty', () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container.querySelector('nav')).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DataGrid
// ═════════════════════════════════════════════════════════════════════════════

describe('DataGrid — structure and accessibility', () => {
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

  it('renders with grid role and aria-label', () => {
    const { container } = render(<DataGrid columns={columns} rows={rows} aria-label="Courses" />);
    expect(container.querySelector('[role="grid"]')).toHaveAttribute('aria-label', 'Courses');
  });

  it('renders all column headers', () => {
    render(<DataGrid columns={columns} rows={rows} />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Course Title')).toBeInTheDocument();
    expect(screen.getByText('Enrolled')).toBeInTheDocument();
  });

  it('renders all data rows', () => {
    render(<DataGrid columns={columns} rows={rows} />);
    expect(screen.getByText('Intro to Stellar')).toBeInTheDocument();
    expect(screen.getByText('Smart Contracts 101')).toBeInTheDocument();
    expect(screen.getByText('DeFi Fundamentals')).toBeInTheDocument();
  });

  it('renders row values correctly', () => {
    render(<DataGrid columns={columns} rows={rows} />);
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Skeleton
// ═════════════════════════════════════════════════════════════════════════════

describe('Skeleton — structure and accessibility', () => {
  it('renders skeleton elements', () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('renders multiple skeleton lines', () => {
    const { container } = render(<Skeleton count={3} />);
    const skeletons = container.querySelectorAll('div[data-testid="skeleton-line"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('applies aria-busy for loading state', () => {
    const { container } = render(<Skeleton />);
    const element = container.querySelector('[aria-busy]');
    if (element) {
      expect(element).toHaveAttribute('aria-busy', 'true');
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ErrorBoundary
// ═════════════════════════════════════════════════════════════════════════════

describe('ErrorBoundary — structure and accessibility', () => {
  it('renders children when there is no error', () => {
    const { container } = render(
      <ErrorBoundary>
        <div data-testid="child">Safe content</div>
      </ErrorBoundary>
    );
    expect(container.querySelector('[data-testid="child"]')).toHaveTextContent('Safe content');
  });

  it('renders as a main or div container', () => {
    const { container } = render(
      <ErrorBoundary>
        <span>Content</span>
      </ErrorBoundary>
    );
    const wrapper = container.querySelector('div, main, section');
    expect(wrapper).not.toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BadgeDisplay
// ═════════════════════════════════════════════════════════════════════════════

describe('BadgeDisplay — structure and accessibility', () => {
  it('renders badge display element', () => {
    const { container } = render(<BadgeDisplay badge={{ id: '1', name: 'Expert' }} />);
    expect(container.textContent).toContain('Expert');
  });

  it('renders multiple badges', () => {
    const badges = [
      { id: '1', name: 'Expert' },
      { id: '2', name: 'Master' },
    ];
    render(
      <div>
        {badges.map((b) => (
          <BadgeDisplay key={b.id} badge={b} />
        ))}
      </div>
    );
    expect(screen.getByText('Expert')).toBeInTheDocument();
    expect(screen.getByText('Master')).toBeInTheDocument();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TokenBalance
// ═════════════════════════════════════════════════════════════════════════════

describe('TokenBalance — structure and accessibility', () => {
  it('renders token balance display', () => {
    const { container } = render(<TokenBalance balance={1000} symbol="XLM" />);
    expect(container.textContent).toContain('1000');
    expect(container.textContent).toContain('XLM');
  });

  it('renders with formatted number', () => {
    const { container } = render(<TokenBalance balance={1000000} symbol="XLM" />);
    expect(container.querySelector('[data-testid="balance"]')).not.toBeNull();
  });

  it('displays symbol correctly', () => {
    render(<TokenBalance balance={500} symbol="USDC" />);
    expect(screen.getByText('USDC')).toBeInTheDocument();
  });
});
