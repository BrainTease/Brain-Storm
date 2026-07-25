/**
 * Single source of truth for form control styling.
 *
 * Every input-like primitive in this library composes its classes from here so
 * that a text input, textarea and select stay visually identical and move
 * together when the design changes.
 */

export const LABEL_CLASS = 'text-sm font-medium text-gray-700 dark:text-gray-300';

export const HELPER_TEXT_CLASS = 'text-xs text-gray-500 dark:text-gray-400';

export const ERROR_TEXT_CLASS = 'text-xs text-red-600';

/** `md` is the default form density; `sm` matches the compact filter/toolbar rows. */
export type ControlSize = 'sm' | 'md';

const CONTROL_BASE = `border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed`;

const CONTROL_SIZE: Record<ControlSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2',
};

const CONTROL_BORDER_VALID = 'border-gray-300 dark:border-gray-600';

const CONTROL_BORDER_INVALID = 'border-red-500';

export const CHECKBOX_CLASS =
  'h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

export const RADIO_CLASS =
  'accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

export interface ControlStyleOptions {
  /** Renders the error border. */
  invalid?: boolean;
  size?: ControlSize;
  /** Set to false for controls that should size to their content, e.g. filter bars. */
  fullWidth?: boolean;
  /** Caller-supplied classes, appended last so they win. */
  className?: string;
}

/** Builds the class list for a text/textarea/select control. */
export function controlClass({
  invalid = false,
  size = 'md',
  fullWidth = true,
  className = '',
}: ControlStyleOptions = {}): string {
  return `${fullWidth ? 'w-full' : ''} ${CONTROL_BASE}
          ${CONTROL_SIZE[size]}
          ${invalid ? CONTROL_BORDER_INVALID : CONTROL_BORDER_VALID}
          ${className}`;
}

/** Turns a human label into a deterministic DOM id (`Email address` -> `email-address`). */
export function slugifyLabel(label?: string): string | undefined {
  if (!label) return undefined;
  return label.toLowerCase().replace(/\s+/g, '-');
}
