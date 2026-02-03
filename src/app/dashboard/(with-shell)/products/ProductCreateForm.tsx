'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

const PRODUCT_TYPES = [
  { value: 'ONE_TIME', label: 'One-time' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
];

const PRODUCT_STATUS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const INTERVALS = ['', 'DAY', 'WEEK', 'MONTH', 'YEAR'];

export default function ProductCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    slug: '',
    type: 'SUBSCRIPTION',
    status: 'ACTIVE',
    unitAmount: '',
    currency: 'USD',
    interval: 'MONTH',
    intervalCount: '1',
    tags: '',
    features: '',
  });
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const payload = {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    type: form.type,
    status: form.status,
    unitAmount: Number(form.unitAmount) || 0,
    currency: form.currency.trim() || 'USD',
    interval: form.interval || null,
    intervalCount: form.intervalCount ? Number(form.intervalCount) : null,
    tags: form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    features: form.features
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to create product');
      }
      setForm({
        name: '',
        slug: '',
        type: 'SUBSCRIPTION',
        status: 'ACTIVE',
        unitAmount: '',
        currency: 'USD',
        interval: 'MONTH',
        intervalCount: '1',
        tags: '',
        features: '',
      });
      firstFieldRef.current?.focus();
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/80 p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Create product</label>
        <p className="text-sm text-zinc-500">Add products via the UI; owners and admins only.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-zinc-600">Name</label>
          <input
            ref={firstFieldRef}
            type="text"
            value={form.name}
            required
            onChange={(event) => handleChange('name', event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-primary-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-600">Slug (optional)</label>
          <input
            type="text"
            value={form.slug}
            onChange={(event) => handleChange('slug', event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-primary-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-600">Type</label>
          <select
            value={form.type}
            onChange={(event) => handleChange('type', event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-primary-600 focus:outline-none"
          >
            {PRODUCT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-600">Status</label>
          <select
            value={form.status}
            onChange={(event) => handleChange('status', event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-primary-600 focus:outline-none"
          >
            {PRODUCT_STATUS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="text-xs font-semibold text-zinc-600">Price (cents)</label>
          <input
            type="number"
            min={0}
            value={form.unitAmount}
            required
            onChange={(event) => handleChange('unitAmount', event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-primary-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-600">Currency</label>
          <input
            type="text"
            value={form.currency}
            onChange={(event) => handleChange('currency', event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-primary-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-600">Interval</label>
          <select
            value={form.interval}
            onChange={(event) => handleChange('interval', event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-primary-600 focus:outline-none"
          >
            {INTERVALS.map((interval) => (
              <option key={interval} value={interval}>
                {interval || 'One-time'}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-zinc-600">Interval count</label>
          <input
            type="number"
            min={1}
            value={form.intervalCount}
            onChange={(event) => handleChange('intervalCount', event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-primary-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-600">Tags (comma separated)</label>
          <input
            type="text"
            value={form.tags}
            onChange={(event) => handleChange('tags', event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-primary-600 focus:outline-none"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-zinc-600">Features (comma separated)</label>
        <textarea
          value={form.features}
          rows={2}
          onChange={(event) => handleChange('features', event.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-brand-primary-600 focus:outline-none"
        />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Create product'}
        </button>
      </div>
    </form>
  );
}
