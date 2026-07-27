'use client';

import { useForm, type UseFormProps, type UseFormReturn, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';

export type ZodFormOptions<T extends FieldValues> = Omit<UseFormProps<T>, 'resolver'> & {
  schema: ZodType<T>;
};

export function useZodForm<T extends FieldValues>({
  schema,
  mode = 'onBlur',
  ...rest
}: ZodFormOptions<T>): UseFormReturn<T> {
  return useForm<T>({
    mode,
    resolver: zodResolver(schema),
    ...rest,
  });
}
