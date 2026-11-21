'use client';

import { FormProvider, type UseFormReturn, type FieldValues } from 'react-hook-form';
import React, { useCallback, useMemo } from 'react';

export interface FormProps<T extends FieldValues> extends Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  'onSubmit'
> {
  form: UseFormReturn<T>;
  onSubmit: (values: T) => unknown | Promise<unknown>;
  children: React.ReactNode;
}

function FormInner<T extends FieldValues>({
  form,
  onSubmit,
  children,
  className = '',
  ...rest
}: FormProps<T>) {
  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      void form.handleSubmit(onSubmit)(event);
    },
    [form, onSubmit],
  );

  const formClassName = useMemo(() => `space-y-4 ${className}`, [className]);

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={handleSubmit} className={formClassName} {...rest}>
        {children}
      </form>
    </FormProvider>
  );
}

export const Form = React.memo(FormInner) as typeof FormInner;
