// src/app/page.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          router.push('/dashboard');
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [router]);

  const handleSubmit = (form: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const payload = Object.fromEntries(form.entries());
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        const txt = await res.text();
        setMessage(txt || 'Something went wrong. Please try again.');
      }
    });
  };

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-600">Loading...</div>;
  }

  const register = mode === 'register';

  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-0 py-6">
      <div className="w-full">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-wide">Invoicing Made Simple</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold">Manage invoices, clients, and branding in one place.</h2>
              <p className="text-sm text-blue-100">
                Save drafts, send branded emails, and download PDFs — now using your own company info and reply-to email.
              </p>
            </div>
            <div className="text-sm text-blue-100">
              <ul className="space-y-1">
                <li>- Secure login & registration</li>
                <li>- Branded emails and PDFs</li>
                <li>- Reply-to set to your account email</li>
                <li>- Due dates optional</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-1">
          <div className="p-10">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-zinc-900">{register ? 'Create your account' : 'Welcome'}</h1>
                <p className="text-sm text-zinc-500">
                  {register ? 'Register to start sending invoices.' : 'Sign in to manage your invoices and clients.'}
                </p>
              </div>
              <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Secure</div>
            </div>

            <div className="mb-6 flex gap-2 rounded-xl bg-zinc-100 p-1 text-sm font-medium text-zinc-700">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 rounded-lg px-3 py-2 transition ${mode === 'login' ? 'bg-white shadow-sm' : 'hover:bg-white/70'}`}
              >
                Login
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 rounded-lg px-3 py-2 transition ${mode === 'register' ? 'bg-white shadow-sm' : 'hover:bg-white/70'}`}
              >
                Register
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(new FormData(e.currentTarget));
              }}
            >
              {register && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700">Name</label>
                    <input
                      name="name"
                      required
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700">Company Name</label>
                    <input
                      name="companyName"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              {register && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700">Logo URL</label>
                    <input
                      name="logoDataUrl"
                      placeholder="https://..."
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700">Phone</label>
                    <input
                      name="phone"
                      placeholder="(555) 123-4567"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                </div>
              )}

              {register && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Address</label>
                  <input
                    name="addressLine1"
                    placeholder="Street"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                  <input
                    name="addressLine2"
                    placeholder="Apt, suite, etc. (optional)"
                    className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      name="city"
                      placeholder="City"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                    <input
                      name="state"
                      placeholder="State"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                    <input
                      name="postalCode"
                      placeholder="ZIP"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <input
                    name="country"
                    defaultValue="USA"
                    placeholder="Country"
                    className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>
              )}

              {message && <p className="text-sm text-rose-600">{message}</p>}

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {isPending ? 'Working...' : mode === 'login' ? 'Login' : 'Register'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
