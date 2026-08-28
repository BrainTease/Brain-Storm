import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '@/components/ui/Modal';

// Helper to render the modal with a trigger button so we can test focus restore
function setup(isOpen: boolean, onClose = vi.fn()) {
  return render(
    <div>
      <button data-testid="trigger">Open Modal</button>
      <Modal isOpen={isOpen} onClose={onClose} title="Test Dialog">
        <input data-testid="first-input" placeholder="First" />
        <input data-testid="second-input" placeholder="Second" />
        <button data-testid="inner-btn">Inner Button</button>
      </Modal>
    </div>
  );
}

describe('Modal accessibility', () => {
  it('is not in the DOM when isOpen=false', () => {
    setup(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders with role="dialog" when open', () => {
    setup(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('has aria-modal="true" when open', () => {
    setup(true);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('has aria-labelledby pointing to the title heading', () => {
    setup(true);
    const dialog = screen.getByRole('dialog');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const heading = document.getElementById(labelId!);
    expect(heading).toHaveTextContent('Test Dialog');
  });

  it('moves focus into the modal on open (first focusable element)', async () => {
    setup(true);
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByTestId('first-input'));
    });
  });

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    setup(true, onClose);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Dialog">
        <p>Content</p>
      </Modal>
    );
    // The backdrop is the fixed div with aria-hidden immediately before the dialog
    const backdrop = document.querySelector('.fixed.inset-0.bg-black') as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    setup(true, onClose);
    await user.click(screen.getByRole('button', { name: /close modal/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('Tab key cycles focus forward within modal', async () => {
    const user = userEvent.setup();
    setup(true);

    // Wait for initial focus on first-input
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByTestId('first-input'));
    });

    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId('second-input'));

    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId('inner-btn'));

    // Next tab should wrap to close button (first focusable in dialog is close button? Let's check)
    // Actually first focusable is first-input, last is inner-btn; close button is after inner-btn
    // The order in DOM: close button (in header), first-input, second-input, inner-btn
    await user.tab();
    // Should wrap to the close button (first focusable)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /close modal/i }));
  });

  it('Shift+Tab cycles focus backward within modal', async () => {
    const user = userEvent.setup();
    setup(true);

    // Wait for initial focus
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByTestId('first-input'));
    });

    // Shift+Tab from first focusable element should wrap to the last
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByTestId('inner-btn'));
  });

  it('restores focus to the previously focused element when modal closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <div>
        <button data-testid="trigger">Open</button>
        <Modal isOpen={false} onClose={onClose} title="Dialog">
          <button>Inner</button>
        </Modal>
      </div>
    );

    // Focus the trigger button before opening
    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Open the modal
    rerender(
      <div>
        <button data-testid="trigger">Open</button>
        <Modal isOpen onClose={onClose} title="Dialog">
          <button>Inner</button>
        </Modal>
      </div>
    );

    // Focus should move into the modal
    await waitFor(() => {
      expect(document.activeElement).not.toBe(trigger);
    });

    // Close the modal
    rerender(
      <div>
        <button data-testid="trigger">Open</button>
        <Modal isOpen={false} onClose={onClose} title="Dialog">
          <button>Inner</button>
        </Modal>
      </div>
    );

    // Focus should be restored to the trigger
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });
});
