'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { VerificationCodeInput } from '@/components/ui/VerificationCodeInput';
import { useCountdown } from '@/hooks/useCountdown';
import { logError } from '@/lib/errorLogger';

type Status = 'idle' | 'verifying' | 'success' | 'error';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenFromUrl = params.get('token');
  const emailFromUrl = params.get('email') ?? '';

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState('');
  const [resending, setResending] = useState(false);
  const { secondsLeft, start: startCountdown, isActive: cooldownActive } = useCountdown(0);

  const verifyToken = useCallback(async (token: string) => {
    setStatus('verifying');
    setError(null);
    try {
      await api.get('/auth/verify', { params: { token } });
      setStatus('success');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'The verification link is invalid or has expired.';
      setError(message);
      setStatus('error');
      logError(err, { source: 'verify-email' });
    }
  }, []);

  useEffect(() => {
    if (tokenFromUrl) {
      verifyToken(tokenFromUrl);
    }
  }, [tokenFromUrl, verifyToken]);

  const handleResend = async () => {
    if (!email || cooldownActive) return;
    setResending(true);
    setError(null);
    try {
      await api.post('/auth/resend-verification', { email });
      startCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not resend the verification email.';
      setError(message);
      logError(err, { source: 'verify-email-resend' });
    } finally {
      setResending(false);
    }
  };

  const handleCodeComplete = (entered: string) => {
    // Treats the code as a verification token. If the backend later supports
    // OTP-style codes, this path is ready to call a dedicated endpoint.
    setCode(entered);
    verifyToken(entered);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow p-8 flex flex-col gap-6">
        {status === 'verifying' && (
          <div role="status" aria-live="polite" className="text-center flex flex-col items-center gap-4">
            <Spinner size="lg" label="Verifying your email" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Verifying your email…
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This will only take a moment.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div role="status" aria-live="polite" className="text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-4xl" aria-hidden="true">
              ✓
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Email verified
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your email address has been confirmed. You can now access your account.
            </p>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Continue to dashboard
            </Button>
          </div>
        )}

        {(status === 'idle' || status === 'error') && (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Verify your email
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {emailFromUrl
                  ? `We sent a verification link to ${emailFromUrl}.`
                  : 'Enter the 6-digit code from your email or click the link we sent you.'}
              </p>
            </div>

            <VerificationCodeInput
              value={code}
              onChange={setCode}
              onComplete={handleCodeComplete}
              error={status === 'error' ? error ?? undefined : undefined}
            />

            {status === 'error' && !error?.includes('code') && (
              <div role="alert" className="text-sm text-red-600 text-center">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              {!emailFromUrl && (
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              )}

              <Button
                onClick={handleResend}
                disabled={!email || resending || cooldownActive}
                variant="outline"
                className="w-full"
                aria-live="polite"
              >
                {resending
                  ? 'Sending…'
                  : cooldownActive
                  ? `Resend available in ${secondsLeft}s`
                  : 'Resend verification email'}
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Wrong account?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:underline dark:text-blue-400">
                Sign in with a different email
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
