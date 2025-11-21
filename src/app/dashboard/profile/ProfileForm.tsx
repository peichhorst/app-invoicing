'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type ProfileFormProps = {
  initial: {
    name: string;
    email: string;
    companyName?: string | null;
    logoDataUrl?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  };
};

export function ProfileForm({ initial }: ProfileFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    startTransition(async () => {
      setMessage(null);
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.refresh();
        window.location.assign('/dashboard');
      } else {
        const txt = await res.text();
        setMessage(txt || 'Update failed');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Name</label>
          <input
            name="name"
            defaultValue={initial.name}
            required
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={initial.email}
            required
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Company Name</label>
          <input
            name="companyName"
            defaultValue={initial.companyName ?? ''}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Logo URL</label>
          <input
            name="logoDataUrl"
            defaultValue={initial.logoDataUrl ?? ''}
            placeholder="https://..."
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Phone</label>
          <input
            name="phone"
            defaultValue={initial.phone ?? ''}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Password (leave blank to keep)</label>
          <input
            name="password"
            type="password"
            placeholder="••••••••"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-700">Address</label>
        <input
          name="addressLine1"
          defaultValue={initial.addressLine1 ?? ''}
          placeholder="Street"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        />
        <input
          name="addressLine2"
          defaultValue={initial.addressLine2 ?? ''}
          placeholder="Apt, suite, etc."
          className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        />
        <div className="grid gap-3 md:grid-cols-3">
          <input
            name="city"
            defaultValue={initial.city ?? ''}
            placeholder="City"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
          <input
            name="state"
            defaultValue={initial.state ?? ''}
            placeholder="State"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
          <input
            name="postalCode"
            defaultValue={initial.postalCode ?? ''}
            placeholder="ZIP"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
        <input
          name="country"
          defaultValue={initial.country ?? 'USA'}
          placeholder="Country"
          className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        />
      </div>

      {message && <p className="text-sm text-rose-600">{message}</p>}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60"
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
