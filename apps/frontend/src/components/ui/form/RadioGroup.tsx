import React from 'react';
import { FieldFeedback, useFieldA11y, type FieldMeta } from './Field';
import { LABEL_CLASS, RADIO_CLASS } from './fieldStyles';

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps extends FieldMeta {
  /** Shared `name` for the underlying radio inputs. */
  name: string;
  options: RadioOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  /** `vertical` stacks the options; `horizontal` wraps them onto one row. */
  orientation?: 'vertical' | 'horizontal';
  /** Keeps `label` as the accessible group name while hiding it visually. */
  labelHidden?: boolean;
  id?: string;
  className?: string;
}

/**
 * Labelled group of mutually exclusive radios, rendered as a `fieldset` so
 * assistive technology announces the group label with each option.
 */
export function RadioGroup({
  name,
  options,
  value,
  onValueChange,
  label,
  error,
  helperText,
  id,
  orientation = 'vertical',
  labelHidden = false,
  className = '',
}: RadioGroupProps) {
  const { fieldId, a11yProps } = useFieldA11y({ id, label, error, helperText });

  return (
    <fieldset
      className={`flex flex-col gap-2 ${className}`}
      aria-invalid={a11yProps['aria-invalid']}
      aria-describedby={a11yProps['aria-describedby']}
    >
      {label && <legend className={labelHidden ? 'sr-only' : LABEL_CLASS}>{label}</legend>}
      <div
        className={orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'flex flex-col gap-2'}
      >
        {options.map((option) => {
          const optionId = `${fieldId}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                disabled={option.disabled}
                onChange={() => onValueChange?.(option.value)}
                className={RADIO_CLASS}
              />
              {option.label}
            </label>
          );
        })}
      </div>
      <FieldFeedback fieldId={fieldId} error={error} helperText={helperText} />
    </fieldset>
  );
}
