export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Describes the control for assistive technology; required since there is no visible label. */
  ariaLabel: string;
  className?: string;
}

/**
 * Joined row of buttons for picking one of a few short options — the toolbar
 * alternative to a dropdown. Each button exposes its state via `aria-pressed`.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm ${className}`}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={`px-3 py-1.5 transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
