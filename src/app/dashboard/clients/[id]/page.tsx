// src/app/dashboard/clients/[id]/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClientForm, type ClientFormValues } from '@components/ClientForm';

type Client = {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  notes: string | null;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function EditClientPage({ params }: PageProps) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    params.then(({ id }) =>
      fetch(`/api/clients/${id}`)
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          if (active) setClient(data);
        })
        .catch((err) => {
          console.error('Failed to load client', err);
          if (active) setError('Failed to load client');
        })
        .finally(() => {
          if (active) setLoading(false);
        })
    );
    return () => {
      active = false;
    };
  }, [params]);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading client…</div>;
  }

  if (error || !client) {
    return (
      <div className="p-6 text-sm text-red-600">
        {error || 'Client not found.'}{' '}
        <button className="text-blue-600 underline" onClick={() => router.push('/dashboard/clients')}>
          Back to Clients
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Edit Client</h1>
          <button
            type="button"
            onClick={() => router.push('/dashboard/clients')}
            className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
          >
            ← Back to Clients
          </button>
        </div>
        <ClientForm
          initialValues={{
            companyName: client.companyName,
            contactName: client.contactName ?? '',
            email: client.email ?? '',
            phone: client.phone ?? '',
            addressLine1: client.addressLine1 ?? '',
            addressLine2: client.addressLine2 ?? '',
            city: client.city ?? '',
            state: client.state ?? '',
            postalCode: client.postalCode ?? '',
            country: client.country ?? 'USA',
            notes: client.notes ?? '',
          }}
          submitting={saving}
          submitLabel="Save Changes"
          onCancel={() => router.push('/dashboard/clients')}
          onSubmit={async (values: ClientFormValues) => {
            if (!client) return;
            setSaving(true);
            setError(null);

            const res = await fetch(`/api/clients/${client.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values),
            });

            if (res.ok) {
              router.push('/dashboard/clients');
              router.refresh();
            } else {
              setError('Failed to update client');
              console.error('Update client failed', await res.text());
            }
            setSaving(false);
          }}
        />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
