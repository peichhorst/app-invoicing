'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useState, useTransition } from 'react';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    const email = formData.get('email');

    if (typeof email !== 'string' || !email.trim()) {
      setError('Please enter your email.');
      return;
    }

    startTransition(async () => {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        setMessage('If an account exists, a reset link has been emailed to you.');
        formElement.reset();
      } else {
        setError('Unable to send the link right now. Please try again.');
      }
    });
  };

  const handleReset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const password = formData.get('password');

    if (typeof password !== 'string' || password.length < 8) {
      setError('Enter a password with at least 8 characters.');
      return;
    }

    const formElement = event.currentTarget;

    startTransition(async () => {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        setMessage('Password reset! You can now log in with your new password.');
        setError(null);
        formElement.reset();
      } else {
        const text = await res.text();
        setError(text || 'Unable to reset password right now.');
      }
    });
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-gradient-to-br from-brand-primary-700 via-brand-secondary-700 to-brand-accent-700 px-4 py-12 pt-16">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-white/90 p-8 shadow-xl">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-600">ClientWave</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900">Reset your password</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {token ? 'Set a new password for your account.' : 'Enter the email you used to create your account.'}
          </p>
        </div>

        {token ? (
          <form className="space-y-4" onSubmit={handleReset}>
            <div className="space-y-1 text-sm text-zinc-600">
              <label>New password</label>
              <input
                name="password"
                type="password"
                minLength={8}
                required
                className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm text-zinc-900 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-200"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-2xl bg-brand-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-primary-500 disabled:opacity-60"
            >
              {isPending ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleRequest}>
            <div className="space-y-1 text-sm text-zinc-600">
              <label>Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm text-zinc-900 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-200"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-2xl bg-brand-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-primary-500 disabled:opacity-60"
            >
              {isPending ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-rose-500">{error}</p>}

        <p className="text-center text-xs text-zinc-500">
          <Link href="/" className="font-semibold text-brand-primary-600 underline underline-offset-4">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
