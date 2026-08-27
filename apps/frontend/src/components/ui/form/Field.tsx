import React from 'react';
import { ERROR_TEXT_CLASS, HELPER_TEXT_CLASS, LABEL_CLASS, slugifyLabel } from './fieldStyles';

/** Props shared by every field primitive in this library. */
export interface FieldMeta {
  /** Visible label. Also used to derive the control id when none is given. */
  label?: string;
  /** Validation message. Its presence puts the control into the invalid state. */
  error?: string;
  /** Hint shown below the control, hidden while an error is displayed. */
  helperText?: string;
}

/**
 * Resolves the control id and the aria wiring shared by all field primitives.
 *
 * `error` takes precedence over `helperText` for `aria-describedby` because
 * only one of the two is ever rendered.
 */
export function useFieldA11y({ id, label, error, helperText }: FieldMeta & { id?: string }) {
  const generatedId = React.useId();
  const fieldId = id ?? slugifyLabel(label) ?? generatedId;

  return {
    fieldId,
    a11yProps: {
      id: fieldId,
      'aria-invalid': !!error,
      'aria-describedby': error ? `${fieldId}-error` : helperText ? `${fieldId}-helper` : undefined,
    } as const,
  };
}

/** Renders the error message, or the helper text when there is no error. */
export function FieldFeedback({ fieldId, error, helperText }: FieldMeta & { fieldId: string }) {
  if (error) {
    return (
      <p id={`${fieldId}-error`} role="alert" className={ERROR_TEXT_CLASS}>
        {error}
      </p>
    );
  }
  if (helperText) {
    return (
      <p id={`${fieldId}-helper`} className={HELPER_TEXT_CLASS}>
        {helperText}
      </p>
    );
  }
  return null;
}

/**
 * Layout shell for a labelled form control: label above, control, feedback below.
 * The control itself is supplied by the caller so this stays element-agnostic.
 */
export function Field({
  fieldId,
  label,
  error,
  helperText,
  children,
}: FieldMeta & { fieldId: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={fieldId} className={LABEL_CLASS}>
          {label}
        </label>
      )}
      {children}
      <FieldFeedback fieldId={fieldId} error={error} helperText={helperText} />
    </div>
  );
}
