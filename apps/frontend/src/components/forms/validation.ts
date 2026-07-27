'use client';

import { useCallback, useRef } from 'react';
import type { Validate } from 'react-hook-form';

/**
 * Debounced async validator factory. Use as a `validate` rule on a field:
 *
 *   const checkEmail = useAsyncValidator(async (email) => {
 *     const r = await fetch(`/api/users/exists?email=${email}`);
 *     const { exists } = await r.json();
 *     return !exists || 'Email is already taken';
 *   }, 400);
 *
 *   <TextField name="email" rules={{ validate: checkEmail }} />
 *
 * Returns true | string | Promise<true | string>. Returning a string marks
 * the field invalid with that message — same contract as react-hook-form.
 */
export function useAsyncValidator<TValue>(
  fn: (value: TValue) => Promise<true | string>,
  debounceMs = 300
): Validate<TValue, Record<string, unknown>> {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (value: TValue) => {
      if (timer.current) clearTimeout(timer.current);
      return new Promise<true | string>((resolve) => {
        timer.current = setTimeout(async () => {
          try {
            resolve(await fn(value));
          } catch {
            resolve('Validation failed');
          }
        }, debounceMs);
      });
    },
    [fn, debounceMs]
  );
}
