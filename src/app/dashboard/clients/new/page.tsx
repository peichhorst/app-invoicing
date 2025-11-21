// src/app/dashboard/clients/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ClientForm, type ClientFormValues } from '@components/ClientForm';

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

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
      alert('Failed — check the console');
      console.error('Create client failed', await res.text());
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-3xl font-bold">Add New Client</h1>
        <ClientForm
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard/clients')}
          submitting={saving}
          submitLabel="Save Client"
        />
      </div>
    </div>
  );
}
