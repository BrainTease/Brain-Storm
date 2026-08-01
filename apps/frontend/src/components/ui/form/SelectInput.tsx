import React from 'react';
import { Field, useFieldA11y, type FieldMeta } from './Field';
import { controlClass, type ControlSize } from './fieldStyles';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectInputProps
  extends
    FieldMeta,
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'aria-invalid' | 'children' | 'size'> {
  options: SelectOption[];
  /** Prepended entry rendered before `options`, e.g. an "All levels" reset row. */
  placeholderOption?: SelectOption;
  size?: ControlSize;
  fullWidth?: boolean;
}

/** Labelled dropdown built from a plain `{ value, label }[]` list. */
export const SelectInput = React.forwardRef<HTMLSelectElement, SelectInputProps>(
  function SelectInput(
    {
      label,
      error,
      helperText,
      id,
      options,
      placeholderOption,
      className = '',
      size,
      fullWidth,
      ...rest
    },
    ref
  ) {
    const { fieldId, a11yProps } = useFieldA11y({ id, label, error, helperText });
    const allOptions = placeholderOption ? [placeholderOption, ...options] : options;

    return (
      <Field fieldId={fieldId} label={label} error={error} helperText={helperText}>
        <select
          {...a11yProps}
          ref={ref}
          className={controlClass({ invalid: !!error, size, fullWidth, className })}
          {...rest}
        >
          {allOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }
);
