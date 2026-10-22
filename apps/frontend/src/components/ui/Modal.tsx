'use client';

import { useEffect, useRef, useId, type ReactNode, type RefObject } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Renders the default header (title + close button). Ignored if `header` is provided. */
  title?: string;
  /** Custom header, replacing the default title/close-button row. */
  header?: ReactNode;
  /** Rendered below the body, outside its padding — for action bars with distinct styling. */
  footer?: ReactNode;
  children: ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  /** aria-label for the dialog when no `title` is set (and `header` doesn't supply its own labelling). */
  ariaLabel?: string;
}

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Escape closes (when enabled); Tab / Shift+Tab cycle focus within the dialog. */
function useModalKeyboard(
  isOpen: boolean,
  dialogRef: RefObject<HTMLDivElement>,
  onClose: () => void,
  closeOnEscape: boolean
) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (closeOnEscape) onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      ).filter((el) => !el.closest('[aria-hidden="true"]'));

      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, closeOnEscape, dialogRef]);
}

/** Locks body scroll, moves focus into the dialog on open and restores it on close. */
function useModalFocus(isOpen: boolean, dialogRef: RefObject<HTMLDivElement>) {
  const previouslyFocusedRef = useRef<Element | null>(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement;

      // Defer focus until after paint so the dialog is rendered
      const frame = requestAnimationFrame(() => {
        if (!dialogRef.current) return;
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          dialogRef.current.focus();
        }
      });
      return () => cancelAnimationFrame(frame);
    } else if (previouslyFocusedRef.current instanceof HTMLElement) {
      // Restore focus when modal closes
      previouslyFocusedRef.current.focus();
    }
  }, [isOpen, dialogRef]);
}

export function Modal({
  isOpen,
  onClose,
  title,
  header,
  footer,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  ariaLabel,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useModalFocus(isOpen, dialogRef);
  useModalKeyboard(isOpen, dialogRef, onClose, closeOnEscape);

  if (!isOpen) return null;

  const showDefaultHeader = !header && (title || showCloseButton);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg ${SIZE_CLASSES[size]} w-full mx-4 focus:outline-none`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-700 dark:hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer}
      </div>
    </div>
  );
}
