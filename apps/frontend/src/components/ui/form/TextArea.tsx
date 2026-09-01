import React from 'react';
import { Field, useFieldA11y, type FieldMeta } from './Field';
import { controlClass, type ControlSize } from './fieldStyles';

export interface TextAreaProps
  extends FieldMeta, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'aria-invalid'> {
  size?: ControlSize;
  fullWidth?: boolean;
}

/** Labelled multi-line text control. Shares styling and aria wiring with {@link TextInput}. */
export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, helperText, id, className = '', rows = 4, size, fullWidth, ...rest },
  ref
) {
  const { fieldId, a11yProps } = useFieldA11y({ id, label, error, helperText });

  return (
    <Field fieldId={fieldId} label={label} error={error} helperText={helperText}>
      <textarea
        {...a11yProps}
        ref={ref}
        rows={rows}
        className={controlClass({ invalid: !!error, size, fullWidth, className })}
        {...rest}
      />
    </Field>
  );
});
