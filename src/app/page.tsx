// src/app/page.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('register');
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
    <div className="min-h-screen bg-white">
      <div className="w-full bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 px-4 pb-12 pt-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.25em]">SuperInvoicing</p>
            <h1 className="text-3xl font-semibold leading-tight">Invoicing made simple.</h1>
            <p className="text-sm text-white/80">
              Manage invoices, clients, and branding in one place. Save drafts, send branded emails, and download PDFs
              using your own company info.
            </p>
            <ul className="space-y-1 text-sm text-white/80">
              <li>- Secure login and registration</li>
              <li>- Branded emails and PDFs</li>
              <li>- Reply-to set to your account email</li>
              <li>- Due dates optional</li>
            </ul>
          </div>

          <div className="flex-1">
            <div className="rounded-2xl border border-white/25 bg-white/10 p-6 shadow-xl backdrop-blur">
              <div className="mb-6 flex items-center justify-between text-white">
                <div>
                  <h2 className="text-2xl font-semibold">{register ? 'Create your account' : 'Welcome back'}</h2>
                  <p className="text-sm text-white/70">
                    {register ? 'Register to start sending invoices.' : 'Sign in to manage your invoices and clients.'}
                  </p>
                </div>
                <div className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  Secure
                </div>
              </div>

              <div className="mb-6 flex gap-2 text-sm font-medium text-white">
                <button
                  onClick={() => setMode('register')}
                  className={`flex-1 rounded-lg px-3 py-2 transition cursor-pointer ${
                    mode === 'register' ? 'bg-white text-purple-700 shadow' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  Register
                </button>
                <button
                  onClick={() => setMode('login')}
                  className={`flex-1 rounded-lg px-3 py-2 transition cursor-pointer ${
                    mode === 'login' ? 'bg-white text-purple-700 shadow' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  Login
                </button>
              </div>

              <form
                className="space-y-4 text-white"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(new FormData(e.currentTarget));
                }}
              >
                {register && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Name</label>
                      <input
                        name="name"
                        required
                        className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Company Name</label>
                      <input
                        name="companyName"
                        placeholder="Optional"
                        className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Password</label>
                  <input
                    name="password"
                    type="password"
                    required
                    className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>

                {register && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Logo URL</label>
                      <input
                        name="logoDataUrl"
                        placeholder="https://..."
                        className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Phone</label>
                      <input
                        name="phone"
                        placeholder="(555) 123-4567"
                        className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                      />
                    </div>
                  </div>
                )}

                {register && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Address</label>
                    <input
                      name="addressLine1"
                      placeholder="Street"
                      className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                    <input
                      name="addressLine2"
                      placeholder="Apt, suite, etc. (optional)"
                      className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        name="city"
                        placeholder="City"
                        className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                      />
                      <input
                        name="state"
                        placeholder="State"
                        className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                      />
                      <input
                        name="postalCode"
                        placeholder="ZIP"
                        className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                      />
                    </div>
                    <input
                      name="country"
                      defaultValue="USA"
                      placeholder="Country"
                      className="mt-2 w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>
                )}

                {message && <p className="text-sm text-rose-200">{message}</p>}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-white/90 disabled:opacity-60 cursor-pointer"
                >
                  {isPending ? 'Working...' : mode === 'login' ? 'Login' : 'Register'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
