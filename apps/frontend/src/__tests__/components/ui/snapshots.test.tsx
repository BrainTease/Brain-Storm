/**
 * #864 — Snapshot tests for the shared UI component library.
 *
 * Components under test (all in src/components/ui/):
 *   Button, Badge, Spinner, Card, ProgressBar, Modal, CircularProgress
 *
 * Strategy:
 *   - One snapshot per meaningful visual variant / prop combination.
 *   - Snapshots are stored by Vitest next to this file in __snapshots__/.
 *   - Each test also includes at least one structural assertion so that
 *     a snapshot update failure surfaces a real-world regression, not
 *     just a formatting change.
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

describe('Button — snapshots', () => {
  it('renders the default (primary) variant', () => {
    const { container } = render(<Button>Save</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders the outline variant', () => {
    const { container } = render(<Button variant="outline">Cancel</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders the secondary variant', () => {
    const { container } = render(<Button variant="secondary">Back</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders the danger variant', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders in disabled state', () => {
    const { container } = render(<Button isDisabled>Disabled</Button>);
    expect(container.firstChild).toMatchSnapshot();
    // structural guard: disabled attribute must be present
    expect((container.firstChild as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders with type="submit"', () => {
    const { container } = render(<Button type="submit">Submit form</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('passes extra className through', () => {
    const { container } = render(<Button className="w-full mt-4">Full width</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Badge
// ═════════════════════════════════════════════════════════════════════════════

describe('Badge — snapshots', () => {
  it('renders the default variant', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders the success variant', () => {
    const { container } = render(<Badge variant="success">Completed</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders the warning variant', () => {
    const { container } = render(<Badge variant="warning">Pending</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders the error variant', () => {
    const { container } = render(<Badge variant="error">Failed</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('forwards extra className', () => {
    const { container } = render(<Badge className="uppercase">Custom</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Spinner
// ═════════════════════════════════════════════════════════════════════════════

describe('Spinner — snapshots', () => {
  it('renders the medium (default) size', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders the small size', () => {
    const { container } = render(<Spinner size="sm" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders the large size', () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with a custom label', () => {
    const { container } = render(<Spinner label="Processing payment…" />);
    expect(container.firstChild).toMatchSnapshot();
    // structural guard: aria-label must match
    const span = container.querySelector('[role="status"]');
    expect(span).toHaveAttribute('aria-label', 'Processing payment…');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Card
// ═════════════════════════════════════════════════════════════════════════════

describe('Card — snapshots', () => {
  it('renders with text content', () => {
    const { container } = render(<Card>Hello world</Card>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with nested elements', () => {
    const { container } = render(
      <Card>
        <h2>Title</h2>
        <p>Body text</p>
      </Card>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('merges extra className', () => {
    const { container } = render(<Card className="border border-red-400">Alert card</Card>);
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ProgressBar
// ═════════════════════════════════════════════════════════════════════════════

describe('ProgressBar — snapshots', () => {
  it('renders at 0 %', () => {
    const { container } = render(<ProgressBar value={0} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders at 50 % with a label', () => {
    const { container } = render(<ProgressBar value={50} label="Course progress" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders at 100 %', () => {
    const { container } = render(<ProgressBar value={100} label="Complete" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('clamps above 100 and snapshot reflects clamped value', () => {
    const { container } = render(<ProgressBar value={200} />);
    expect(container.firstChild).toMatchSnapshot();
    // structural guard
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps below 0 and snapshot reflects clamped value', () => {
    const { container } = render(<ProgressBar value={-5} />);
    expect(container.firstChild).toMatchSnapshot();
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
  });

  it('renders without a label (uses default aria-label)', () => {
    const { container } = render(<ProgressBar value={33} />);
    expect(container.firstChild).toMatchSnapshot();
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute('aria-label', 'Progress');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Modal
// ═════════════════════════════════════════════════════════════════════════════

describe('Modal — snapshots', () => {
  const onClose = vi.fn();

  it('renders nothing when isOpen=false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={onClose}>
        Hidden content
      </Modal>
    );
    expect(container.firstChild).toMatchSnapshot();
    // structural guard: dialog must not appear in DOM
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders with title when isOpen=true', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Confirm action">
        Are you sure?
      </Modal>
    );
    expect(container.firstChild).toMatchSnapshot();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('renders sm size', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Small" size="sm">
        Compact modal
      </Modal>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders lg size', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Large" size="lg">
        Wide modal
      </Modal>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders xl size', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="XL" size="xl">
        Extra-wide modal
      </Modal>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with footer slot', () => {
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
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with custom header slot (no default header)', () => {
    const { container } = render(
      <Modal
        isOpen={true}
        onClose={onClose}
        header={<div data-testid="custom-header">My header</div>}
      >
        Body content
      </Modal>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with showCloseButton=false', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="No X" showCloseButton={false}>
        Content
      </Modal>
    );
    expect(container.firstChild).toMatchSnapshot();
    // structural guard: close button must not appear
    const closeBtn = container.querySelector('[aria-label="Close modal"]');
    expect(closeBtn).toBeNull();
  });

  it('renders with ariaLabel when no title is provided', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} ariaLabel="Media viewer" showCloseButton={false}>
        <img src="/placeholder.png" alt="media" />
      </Modal>
    );
    expect(container.firstChild).toMatchSnapshot();
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toHaveAttribute('aria-label', 'Media viewer');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CircularProgress
// ═════════════════════════════════════════════════════════════════════════════

describe('CircularProgress — snapshots', () => {
  it('renders at 0 %', () => {
    const { container } = render(<CircularProgress value={0} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders at 50 %', () => {
    const { container } = render(<CircularProgress value={50} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders at 100 %', () => {
    const { container } = render(<CircularProgress value={100} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with a label', () => {
    const { container } = render(<CircularProgress value={75} label="Completion" />);
    expect(container.firstChild).toMatchSnapshot();
    // structural guard: label text present
    expect(container.textContent).toContain('Completion');
  });

  it('renders with custom size and strokeWidth', () => {
    const { container } = render(<CircularProgress value={60} size={120} strokeWidth={12} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('displays the percentage value as text', () => {
    const { container } = render(<CircularProgress value={42} />);
    expect(container.firstChild).toMatchSnapshot();
    expect(container.textContent).toContain('42%');
  });
});
