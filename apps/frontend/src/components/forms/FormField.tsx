'use client';

import React from 'react';
import {
  useFormContext,
  type FieldValues,
  type FieldPath,
  type RegisterOptions,
} from 'react-hook-form';

type BaseProps<T extends FieldValues> = {
  name: FieldPath<T>;
  label?: string;
  helperText?: string;
  rules?: RegisterOptions<T, FieldPath<T>>;
};

type TextFieldProps<T extends FieldValues> = BaseProps<T> &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'defaultValue'>;

export function TextField<T extends FieldValues>({
  name,
  label,
  helperText,
  rules,
  className = '',
  type = 'text',
  ...rest
}: TextFieldProps<T>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>();
  const error = getError(errors, name);
  const id = `field-${String(name)}`;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        {...register(name, rules)}
        className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
          ${className}`}
        {...rest}
      />
      <FieldFeedback id={id} error={error} helperText={helperText} />
    </div>
  );
}

type TextareaFieldProps<T extends FieldValues> = BaseProps<T> &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name' | 'defaultValue'>;

export function TextareaField<T extends FieldValues>({
  name,
  label,
  helperText,
  rules,
  className = '',
  rows = 4,
  ...rest
}: TextareaFieldProps<T>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>();
  const error = getError(errors, name);
  const id = `field-${String(name)}`;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        {...register(name, rules)}
        className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
          ${className}`}
        {...rest}
      />
      <FieldFeedback id={id} error={error} helperText={helperText} />
    </div>
  );
}

type SelectFieldProps<T extends FieldValues> = BaseProps<T> &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name' | 'defaultValue'> & {
    options: { value: string; label: string }[];
  };

export function SelectField<T extends FieldValues>({
  name,
  label,
  helperText,
  rules,
  options,
  className = '',
  ...rest
}: SelectFieldProps<T>) {
  const {
    register,
    formState: { errors },
  } = useFormContext<T>();
  const error = getError(errors, name);
  const id = `field-${String(name)}`;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <select
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        {...register(name, rules)}
        className={`w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
          ${className}`}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldFeedback id={id} error={error} helperText={helperText} />
    </div>
  );
}

function FieldFeedback({
  id,
  error,
  helperText,
}: {
  id: string;
  error?: string;
  helperText?: string;
}) {
  if (error) {
    return (
      <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
        {error}
      </p>
    );
  }
  if (helperText) {
    return (
      <p id={`${id}-helper`} className="text-xs text-gray-500 dark:text-gray-400">
        {helperText}
      </p>
    );
  }
  return null;
}

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
