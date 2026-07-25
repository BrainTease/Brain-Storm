import React from 'react';
import { Field, useFieldA11y, type FieldMeta } from './Field';
import { controlClass, type ControlSize } from './fieldStyles';

export interface TextInputProps
  extends FieldMeta,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'aria-invalid' | 'size'> {
  size?: ControlSize;
  fullWidth?: boolean;
}

/**
 * Labelled single-line text control — the base building block for every text-ish
 * input (text, email, password, search, number, ...).
 *
 * Forwards its ref so it can be driven by react-hook-form's `register`.
 */
export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, error, helperText, id, className = '', type = 'text', size, fullWidth, ...rest },
  ref
) {
  const { fieldId, a11yProps } = useFieldA11y({ id, label, error, helperText });

  return (
    <Field fieldId={fieldId} label={label} error={error} helperText={helperText}>
      <input
        {...a11yProps}
        ref={ref}
        type={type}
        className={controlClass({ invalid: !!error, size, fullWidth, className })}
        {...rest}
      />
    </Field>
  );
});
