/**
 * #864 — Structure and accessibility tests for the shared UI component library.
 *
 * Components under test (all in src/components/ui/):
 *   Button, Badge, Spinner, Card, ProgressBar, Modal, CircularProgress
 *
 * Strategy:
 *   - Focus on structural integrity and accessibility attributes.
 *   - Avoid brittle snapshots that break on trivial formatting changes.
 *   - Each test validates ARIA attributes, DOM structure, and functional behavior.
 *   - HTML classes and formatting are excluded from tests (implementation details).
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { CircularProgress } from '@/components/ui/CircularProgress';

// ═════════════════════════════════════════════════════════════════════════════
// Button
// ═════════════════════════════════════════════════════════════════════════════

describe('Button — structure and accessibility', () => {
  it('renders as a button element', () => {
    const { container } = render(<Button>Save</Button>);
    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toBe('Save');
  });

  it('renders different variants without changing DOM structure', () => {
    const variants = ['primary', 'outline', 'secondary', 'danger'] as const;
    for (const variant of variants) {
      const { container } = render(<Button variant={variant}>Test</Button>);
      expect(container.querySelector('button')).not.toBeNull();
      expect(container.querySelector('button')?.textContent).toBe('Test');
    }
  });

  it('forwards disabled state to the button element', () => {
    const { container } = render(<Button isDisabled>Disabled</Button>);
    expect((container.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('respects type attribute', () => {
    const { container } = render(<Button type="submit">Submit form</Button>);
    expect(container.querySelector('button')).toHaveAttribute('type', 'submit');
  });

  it('preserves custom className', () => {
    const { container } = render(<Button className="custom-class">Test</Button>);
    expect(container.querySelector('button')).toHaveClass('custom-class');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Badge
// ═════════════════════════════════════════════════════════════════════════════

describe('Badge — structure and accessibility', () => {
  it('renders as a span or div', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.querySelector('span, div');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe('Default');
  });

  it('renders all variants as badge elements', () => {
    const variants = ['default', 'success', 'warning', 'error'] as const;
    for (const variant of variants) {
      const { container } = render(<Badge variant={variant}>Test</Badge>);
      const badge = container.querySelector('span, div');
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toBe('Test');
    }
  });

  it('merges custom className', () => {
    const { container } = render(<Badge className="uppercase">Custom</Badge>);
    const badge = container.querySelector('span, div');
    expect(badge).toHaveClass('uppercase');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Spinner
// ═════════════════════════════════════════════════════════════════════════════

describe('Spinner — structure and accessibility', () => {
  it('renders with status role', () => {
    const { container } = render(<Spinner />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).not.toBeNull();
  });

  it('renders all sizes with status role', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    for (const size of sizes) {
      const { container } = render(<Spinner size={size} />);
      expect(container.querySelector('[role="status"]')).not.toBeNull();
    }
  });

  it('accepts aria-label prop and sets it correctly', () => {
    const { container } = render(<Spinner label="Processing payment…" />);
    const span = container.querySelector('[role="status"]');
    expect(span).toHaveAttribute('aria-label', 'Processing payment…');
  });

  it('provides a default aria-label if none is given', () => {
    const { container } = render(<Spinner />);
    const span = container.querySelector('[role="status"]');
    expect(span).toHaveAttribute('aria-label');
    expect((span?.getAttribute('aria-label') ?? '').length).toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Card
// ═════════════════════════════════════════════════════════════════════════════

describe('Card — structure and accessibility', () => {
  it('renders as a container element', () => {
    const { container } = render(<Card>Hello world</Card>);
    const card = container.querySelector('div, section, article');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('Hello world');
  });

  it('preserves nested elements', () => {
    const { container } = render(
      <Card>
        <h2>Title</h2>
        <p>Body text</p>
      </Card>
    );
    expect(container.querySelector('h2')).toHaveTextContent('Title');
    expect(container.querySelector('p')).toHaveTextContent('Body text');
  });

  it('merges custom className with card styles', () => {
    const { container } = render(<Card className="border border-red-400">Alert card</Card>);
    const card = container.querySelector('[class*="border"]');
    expect(card).toHaveClass('border-red-400');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ProgressBar
// ═════════════════════════════════════════════════════════════════════════════

describe('ProgressBar — structure and accessibility', () => {
  it('renders with progressbar role and aria attributes', () => {
    const { container } = render(<ProgressBar value={50} />);
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).not.toBeNull();
    expect(bar).toHaveAttribute('aria-valuenow');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('sets aria-valuenow to clamped value', () => {
    const testCases = [
      { input: 0, expected: '0' },
      { input: 50, expected: '50' },
      { input: 100, expected: '100' },
      { input: -5, expected: '0' },
      { input: 200, expected: '100' },
    ];

    for (const { input, expected } of testCases) {
      const { container } = render(<ProgressBar value={input} />);
      const bar = container.querySelector('[role="progressbar"]');
      expect(bar).toHaveAttribute('aria-valuenow', expected);
    }
  });

  it('accepts custom aria-label', () => {
    const { container } = render(<ProgressBar value={33} label="Course progress" />);
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute('aria-label', 'Course progress');
  });

  it('provides default aria-label if not supplied', () => {
    const { container } = render(<ProgressBar value={33} />);
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute('aria-label');
    expect((bar?.getAttribute('aria-label') ?? '').length).toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Modal
// ═════════════════════════════════════════════════════════════════════════════

describe('Modal — structure and accessibility', () => {
  const onClose = vi.fn();

  it('does not render when isOpen=false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={onClose}>
        Hidden content
      </Modal>
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders dialog role when isOpen=true', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Confirm action">
        Are you sure?
      </Modal>
    );
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('renders all sizes as dialog elements', () => {
    const sizes = ['sm', 'md', 'lg', 'xl'] as const;
    for (const size of sizes) {
      const { container } = render(
        <Modal isOpen={true} onClose={onClose} title="Test" size={size}>
          Content
        </Modal>
      );
      expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    }
  });

  it('displays title when provided', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="My Title">
        Body
      </Modal>
    );
    expect(container.querySelector('[role="dialog"]')).toHaveTextContent('My Title');
  });

  it('renders close button by default', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Test">
        Content
      </Modal>
    );
    const closeBtn = container.querySelector('[aria-label="Close modal"], button[aria-label*="Close"]');
    expect(closeBtn).not.toBeNull();
  });

  it('hides close button when showCloseButton=false', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="No X" showCloseButton={false}>
        Content
      </Modal>
    );
    const closeBtn = container.querySelector('[aria-label="Close modal"]');
    expect(closeBtn).toBeNull();
  });

  it('applies ariaLabel to dialog when provided', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} ariaLabel="Media viewer" showCloseButton={false}>
        <img src="/placeholder.png" alt="media" />
      </Modal>
    );
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toHaveAttribute('aria-label', 'Media viewer');
  });

  it('renders footer slot when provided', () => {
    const { container } = render(
      <Modal
        isOpen={true}
        onClose={onClose}
        title="With footer"
        footer={<div data-testid="footer">Footer actions</div>}
      >
        Body content
      </Modal>
    );
    expect(container.querySelector('[data-testid="footer"]')).toHaveTextContent('Footer actions');
  });

  it('renders custom header when provided', () => {
    const { container } = render(
      <Modal
        isOpen={true}
        onClose={onClose}
        header={<div data-testid="custom-header">My header</div>}
      >
        Body content
      </Modal>
    );
    expect(container.querySelector('[data-testid="custom-header"]')).toHaveTextContent('My header');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CircularProgress
// ═════════════════════════════════════════════════════════════════════════════

describe('CircularProgress — structure and accessibility', () => {
  it('renders SVG element', () => {
    const { container } = render(<CircularProgress value={50} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders all percentage values', () => {
    const values = [0, 25, 50, 75, 100];
    for (const value of values) {
      const { container } = render(<CircularProgress value={value} />);
      expect(container.querySelector('svg')).not.toBeNull();
      expect(container.textContent).toContain(`${value}%`);
    }
  });

  it('displays percentage value as text', () => {
    const { container } = render(<CircularProgress value={42} />);
    expect(container.textContent).toContain('42%');
  });

  it('accepts custom label', () => {
    const { container } = render(<CircularProgress value={75} label="Completion" />);
    expect(container.textContent).toContain('Completion');
  });

  it('renders with custom size and strokeWidth', () => {
    const { container } = render(<CircularProgress value={60} size={120} strokeWidth={12} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('width', '120');
    expect(svg).toHaveAttribute('height', '120');
  });

  it('applies aria-label for accessibility', () => {
    const { container } = render(<CircularProgress value={50} label="Course progress" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-label');
  });
});
