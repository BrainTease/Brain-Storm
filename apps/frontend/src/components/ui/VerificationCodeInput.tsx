'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface VerificationCodeInputProps {
  length?: number;
  value?: string;
  onChange?: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: string;
  label?: string;
  className?: string;
}

export function VerificationCodeInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  error,
  label = 'Verification code',
  className = '',
}: VerificationCodeInputProps) {
  const [digits, setDigits] = useState<string[]>(() =>
    (value ?? '').padEnd(length, ' ').slice(0, length).split('').map((c) => (c === ' ' ? '' : c)),
  );
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (value !== undefined) {
      const next = value.padEnd(length, ' ').slice(0, length).split('').map((c) => (c === ' ' ? '' : c));
      setDigits(next);
    }
  }, [value, length]);

  useEffect(() => {
    if (autoFocus && !disabled) inputRefs.current[0]?.focus();
  }, [autoFocus, disabled]);

  const emit = useCallback(
    (next: string[]) => {
      const code = next.join('');
      onChange?.(code);
      if (code.length === length && next.every((d) => d !== '')) {
        onComplete?.(code);
      }
    },
    [length, onChange, onComplete],
  );

  const handleChange = (i: number, raw: string) => {
    const char = raw.replace(/\D/g, '').slice(-1);
    if (!char && raw !== '') return;
    const next = [...digits];
    next[i] = char;
    setDigits(next);
    emit(next);
    if (char && i < length - 1) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        const next = [...digits];
        next[i] = '';
        setDigits(next);
        emit(next);
      } else if (i > 0) {
        inputRefs.current[i - 1]?.focus();
        const next = [...digits];
        next[i - 1] = '';
        setDigits(next);
        emit(next);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      inputRefs.current[i - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      inputRefs.current[i + 1]?.focus();
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const next = Array(length).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    emit(next);
    const focusIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <fieldset
      className={`flex flex-col gap-2 ${className}`}
      aria-describedby={error ? 'verification-code-error' : undefined}
    >
      <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</legend>
      <div className="flex gap-2 justify-center" role="group" aria-label={label}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            disabled={disabled}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={!!error}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={`w-12 h-14 text-center text-2xl font-semibold rounded-lg border-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
          />
        ))}
      </div>
      {error && (
        <p id="verification-code-error" role="alert" className="text-xs text-red-600 text-center">
          {error}
        </p>
      )}
    </fieldset>
  );
}
