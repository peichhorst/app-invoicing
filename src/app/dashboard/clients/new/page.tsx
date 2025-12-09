// src/app/dashboard/clients/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClientForm, type ClientFormValues } from '@components/ClientForm';

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [canCreate, setCanCreate] = useState<boolean | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const handleSubmit = async (values: ClientFormValues) => {
    setSaving(true);

    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (res.ok) {
      router.push('/dashboard/clients');
      router.refresh();
    } else {
      const txt = await res.text();
      alert(txt || 'Failed — check the console');
      console.error('Create client failed', txt);
    }
    setSaving(false);
  };

  useEffect(() => {
    const loadLimit = async () => {
      try {
        const res = await fetch('/api/clients/can-create');
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setCanCreate(data.canCreate);
        if (!data.canCreate) {
          setLimitMessage('Free plan allows up to 3 clients. Upgrade to add more.');
        }
      } catch (err: any) {
        console.error('Client limit check failed', err);
        setLimitMessage('Unable to check client limit.');
      }
    };
    void loadLimit();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 px-10 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Add New Client</h1>
            <p className="text-sm text-gray-500">Create a client profile with contact and address details.</p>
          </div>
        </div>
        {canCreate === false ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
            <h2 className="text-lg font-semibold">Upgrade to add more clients</h2>
            <p className="mt-1 text-sm">{limitMessage}</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard/profile')}
                className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
              >
                Upgrade Plan
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/clients')}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                Back to Clients
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <ClientForm
              onSubmit={handleSubmit}
              onCancel={() => router.push('/dashboard/clients')}
              submitting={saving}
              submitLabel="Save Client"
            />
          </div>
        )}
      </div>
    </div>
  );
}
