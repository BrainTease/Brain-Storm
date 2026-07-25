'use client';

import React from 'react';
import {
  useFormContext,
  type FieldValues,
  type FieldPath,
  type RegisterOptions,
} from 'react-hook-form';
import { Checkbox, SelectInput, TextArea, TextInput, type SelectOption } from '@/components/ui/form';

/**
 * react-hook-form adapters over the shared form-input library.
 *
 * These components own only the binding concern — reading the field error out of
 * the form state and registering the control. All markup, styling and aria wiring
 * comes from `components/ui/form`.
 */

type BaseProps<T extends FieldValues> = {
  name: FieldPath<T>;
  label?: string;
  helperText?: string;
  rules?: RegisterOptions<T, FieldPath<T>>;
};

/** Reads the error message for `name` plus the registration props for its control. */
function useField<T extends FieldValues>(
  name: FieldPath<T>,
  rules?: RegisterOptions<T, FieldPath<T>>
) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>();

  return {
    error: getError(errors, name),
    fieldId: `field-${String(name)}`,
    registration: register(name, rules),
  };
}

type TextFieldProps<T extends FieldValues> = BaseProps<T> &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'defaultValue'>;

export function TextField<T extends FieldValues>({
  name,
  label,
  helperText,
  rules,
  ...rest
}: TextFieldProps<T>) {
  const { error, fieldId, registration } = useField<T>(name, rules);

  return (
    <TextInput
      id={fieldId}
      label={label}
      helperText={helperText}
      error={error}
      {...rest}
      {...registration}
    />
  );
}

type TextareaFieldProps<T extends FieldValues> = BaseProps<T> &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name' | 'defaultValue'>;

export function TextareaField<T extends FieldValues>({
  name,
  label,
  helperText,
  rules,
  ...rest
}: TextareaFieldProps<T>) {
  const { error, fieldId, registration } = useField<T>(name, rules);

  return (
    <TextArea
      id={fieldId}
      label={label}
      helperText={helperText}
      error={error}
      {...rest}
      {...registration}
    />
  );
}

type SelectFieldProps<T extends FieldValues> = BaseProps<T> &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name' | 'defaultValue' | 'children'> & {
    options: SelectOption[];
  };

export function SelectField<T extends FieldValues>({
  name,
  label,
  helperText,
  rules,
  options,
  ...rest
}: SelectFieldProps<T>) {
  const { error, fieldId, registration } = useField<T>(name, rules);

  return (
    <SelectInput
      id={fieldId}
      label={label}
      helperText={helperText}
      error={error}
      options={options}
      {...rest}
      {...registration}
    />
  );
}

type CheckboxFieldProps<T extends FieldValues> = BaseProps<T> &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'defaultValue' | 'type'> & {
    variant?: 'inline' | 'row';
  };

export function CheckboxField<T extends FieldValues>({
  name,
  label,
  helperText,
  rules,
  ...rest
}: CheckboxFieldProps<T>) {
  const { error, fieldId, registration } = useField<T>(name, rules);

  return (
    <Checkbox
      id={fieldId}
      label={label}
      helperText={helperText}
      error={error}
      {...rest}
      {...registration}
    />
  );
}

/** Resolves a possibly nested error path (`address.city`) to its message string. */
function getError(errors: Record<string, unknown>, name: string): string | undefined {
  const parts = name.split('.');
  let node: unknown = errors;
  for (const part of parts) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  if (
    node &&
    typeof node === 'object' &&
    'message' in node &&
    typeof (node as { message: unknown }).message === 'string'
  ) {
    return (node as { message: string }).message;
  }
  return undefined;
}
