// @vitest-environment jsdom
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Modal } from '../../components/ui/Modal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function renderModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  const onClose = vi.fn();
  act(() => {
    root.render(
      createElement(
        Modal,
        { isOpen: true, onClose, title: 'Confirm', ...props },
        createElement('input', { 'data-testid': 'field' })
      )
    );
  });
  return { onClose };
}

function pressKey(key: string) {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('Modal rendering', () => {
  it('renders without throwing and shows the title and close button by default', () => {
    renderModal();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container.querySelector('h2')?.textContent).toBe('Confirm');
    expect(container.querySelector('[aria-label="Close modal"]')).not.toBeNull();
  });

  it('hides the default header close button when showCloseButton is false', () => {
    renderModal({ showCloseButton: false });
    expect(container.querySelector('[aria-label="Close modal"]')).toBeNull();
  });

  it('renders a custom header in place of the default header', () => {
    renderModal({ header: createElement('p', { 'data-testid': 'custom-header' }, 'Custom') });
    expect(container.querySelector('[data-testid="custom-header"]')).not.toBeNull();
    expect(container.querySelector('h2')).toBeNull();
  });

  it('applies the size class for the requested size', () => {
    renderModal({ size: 'xl' });
    expect(container.querySelector('[role="dialog"]')?.className).toContain('max-w-5xl');
  });

  it('labels the dialog with ariaLabel when there is no title', () => {
    renderModal({ title: undefined, ariaLabel: 'Quick settings' });
    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'Quick settings'
    );
  });
});

describe('Modal keyboard handling', () => {
  it('closes on Escape by default', () => {
    const { onClose } = renderModal();
    pressKey('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on Escape when closeOnEscape is false', () => {
    const { onClose } = renderModal({ closeOnEscape: false });
    pressKey('Escape');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('wraps focus from the last field to the first on Tab', () => {
    renderModal({ footer: createElement('button', { 'data-testid': 'last' }, 'Save') });
    const first = container.querySelector<HTMLElement>('[aria-label="Close modal"]');
    const last = container.querySelector<HTMLElement>('[data-testid="last"]');
    expect(first).not.toBeNull();
    expect(last).not.toBeNull();

    last!.focus();
    expect(document.activeElement).toBe(last);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(document.activeElement).toBe(first);
  });
});

describe('Modal backdrop', () => {
  it('closes when the backdrop is clicked by default', () => {
    const { onClose } = renderModal();
    const backdrop = container.querySelector<HTMLElement>('.fixed.inset-0.bg-black');
    act(() => backdrop?.click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on backdrop click when closeOnBackdrop is false', () => {
    const { onClose } = renderModal({ closeOnBackdrop: false });
    const backdrop = container.querySelector<HTMLElement>('.fixed.inset-0.bg-black');
    act(() => backdrop?.click());
    expect(onClose).not.toHaveBeenCalled();
  });
});
