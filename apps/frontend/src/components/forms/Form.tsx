'use client';

import { FormProvider, type UseFormReturn, type FieldValues } from 'react-hook-form';
import React from 'react';

export interface FormProps<T extends FieldValues> extends Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  'onSubmit'
> {
  form: UseFormReturn<T>;
  onSubmit: (values: T) => unknown | Promise<unknown>;
  children: React.ReactNode;
}

export function Form<T extends FieldValues>({
  form,
  onSubmit,
  children,
  className = '',
  ...rest
}: FormProps<T>) {
  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className={`space-y-4 ${className}`}
        {...rest}
      >
        {children}
      </form>
    </FormProvider>
  );
}
