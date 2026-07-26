import React from 'react';
import { FieldFeedback, useFieldA11y, type FieldMeta } from './Field';
import { CHECKBOX_CLASS, LABEL_CLASS } from './fieldStyles';

export interface CheckboxProps
  extends FieldMeta,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'aria-invalid' | 'type'> {
  /**
   * Renders label and box on a single justified row inside a bordered card —
   * the toggle-list layout used by the settings screens.
   */
  variant?: 'inline' | 'row';
}

/**
 * Labelled checkbox. Unlike the text primitives the label sits beside the box,
 * so it owns its own layout rather than reusing the `Field` shell.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, error, helperText, id, className = '', variant = 'inline', ...rest },
  ref
) {
  const { fieldId, a11yProps } = useFieldA11y({ id, label, error, helperText });

  const control = (
    <input {...a11yProps} ref={ref} type="checkbox" className={`${CHECKBOX_CLASS} ${className}`} {...rest} />
  );

  if (variant === 'row') {
    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={fieldId}
          className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
          {control}
        </label>
        <FieldFeedback fieldId={fieldId} error={error} helperText={helperText} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {control}
        {label && (
          <label htmlFor={fieldId} className={`${LABEL_CLASS} cursor-pointer`}>
            {label}
          </label>
        )}
      </div>
      <FieldFeedback fieldId={fieldId} error={error} helperText={helperText} />
    </div>
  );
});
