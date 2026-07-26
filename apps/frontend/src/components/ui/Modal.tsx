import { useEffect, type ReactNode } from 'react';

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
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const showDefaultHeader = !header && (title || showCloseButton);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={!title ? ariaLabel : undefined}
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className="fixed inset-0 bg-black/50"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full mx-4 max-h-[90vh] overflow-y-auto ${SIZE_CLASSES[size]}`}
      >
        {header}
        {showDefaultHeader && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-auto"
              >
                ✕
              </button>
            )}
          </div>
        )}
        <div className="p-6">{children}</div>
        {footer}
      </div>
    </div>
  );
}
