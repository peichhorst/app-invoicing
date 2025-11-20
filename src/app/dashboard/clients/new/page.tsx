// src/app/dashboard/clients/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData) as Record<string, FormDataEntryValue>;

    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      alert('Failed — check the console');
      console.error('Create client failed', await res.text());
    }
    setLoading(false);
  };
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Add New Client</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Company Name *</label>
            <input name="companyName" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Name</label>
              <input name="contactName" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input name="email" type="email" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input name="phone" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input name="addressLine1" placeholder="Street" className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <input name="city" placeholder="City" className="rounded-md border border-gray-300 px-3 py-2" />
            <input name="state" placeholder="State" className="rounded-md border border-gray-300 px-3 py-2" />
            <input name="postalCode" placeholder="ZIP" className="rounded-md border border-gray-300 px-3 py-2" />
          </div>

          <div className="flex justify-end gap-4">
            <button type="button" onClick={() => router.push('/dashboard')} className="px-5 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving…' : 'Save Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
