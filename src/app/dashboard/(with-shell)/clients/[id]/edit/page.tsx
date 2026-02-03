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
  assignedToId?: string | null;
  isLead: boolean;
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
  const [assignableUsers, setAssignableUsers] = useState<{ id: string; name: string | null; email: string | null }[]>([]);
  const [canAssign, setCanAssign] = useState(false);

  useEffect(() => {
    let active = true;
    params
      .then(({ id }) =>
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
      )
      .catch((err) => {
        console.error('Failed to load params', err);
        setLoading(false);
        setError('Failed to load client');
      });

    const loadAssignable = async () => {
      try {
        const me = await fetch('/api/auth/me');
        const meJson = await me.json().catch(() => null);
        const role = meJson?.user?.role as string | undefined;
        const elevated = role === 'OWNER' || role === 'ADMIN';
        setCanAssign(elevated);
        if (!elevated) return;
        const res = await fetch('/api/company/members');
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setAssignableUsers(data.members ?? []);
      } catch (err) {
        console.error('Failed to load assignable users', err);
      }
    };

    void loadAssignable();
    return () => {
      active = false;
    };
  }, [params]);

  return (
    <div className="min-h-screen bg-gray-50 px-10 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Edit Client</h1>
            <p className="text-sm text-gray-500">Update client details and contact information.</p>
          </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/clients')}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 cursor-pointer"
          >
            &larr; Back to Clients
          </button>
        </div>
        </div>

        {loading ? (
          <div className="relative min-h-[60vh] w-full">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-brand-primary-600" />
            </div>
          </div>
        ) : error || !client ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            {error || 'Client not found.'}{' '}
            <button className="text-brand-primary-600 underline" onClick={() => router.push('/dashboard/clients')}>
              Back to Clients
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
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
                assignedToId: client.assignedToId ?? '',
                isLead: Boolean(client.isLead),
              }}
              submitting={saving}
              submitLabel="Save Changes"
              onCancel={() => router.push('/dashboard/clients')}
              assignableUsers={assignableUsers}
              canAssign={canAssign}
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
        )}
      </div>
    </div>
  );
}
