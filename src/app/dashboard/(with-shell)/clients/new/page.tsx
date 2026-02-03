// src/app/dashboard/clients/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClientForm, type ClientFormValues } from '@components/ClientForm';

type MemberOption = { id: string; name: string | null; email: string | null };
type ToastState = { message: string; variant: 'success' | 'error' };

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [canCreate, setCanCreate] = useState<boolean | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<MemberOption[]>([]);
  const [canAssign, setCanAssign] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const handleSubmit = async (values: ClientFormValues) => {
    setSaving(true);

    // Always submit as client
    const payload = { ...values, isLead: false };
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setToast({ message: 'Client created.', variant: 'success' });
      setTimeout(() => {
        router.push('/dashboard/clients');
        router.refresh();
      }, 650);
    } else {
      const txt = await res.text();
      setToast({ message: txt || 'Failed to create client', variant: 'error' });
      console.error('Create client failed', txt);
    }
    setSaving(false);
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const meRes = await fetch('/api/auth/me');
        const meJson = await meRes.json().catch(() => null);
        const role = meJson?.user?.role as string | undefined;
        const elevated = role === 'OWNER' || role === 'ADMIN';
        if (meJson?.user?.id) {
          setCurrentUserId(meJson.user.id);
        }
        setCanAssign(elevated);

        const companyId = meJson?.user?.companyId ?? meJson?.user?.company?.id ?? null;
        if (!companyId) {
          setCanCreate(false);
          setLimitMessage('You must belong to a company before creating clients.');
        } else {
          const res = await fetch('/api/clients/can-create');
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          setCanCreate(data.canCreate);
          if (!data.canCreate) {
            setLimitMessage('Free plan allows up to 3 clients. Upgrade to add more.');
          }
          if (elevated) {
            const membersRes = await fetch('/api/company/members');
            if (!membersRes.ok) throw new Error(await membersRes.text());
            const membersData = await membersRes.json();
            if (isMounted) {
              setAssignableUsers(membersData.members ?? []);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load client helpers', err);
        setLimitMessage('Unable to verify client limits at this time.');
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition ${
            toast.variant === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        >
          {toast.message}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Add New Client</h1>
          <p className="mt-1 text-sm text-zinc-500">Create a client profile with contact and address details.</p>
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
              className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700"
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
            initialValues={currentUserId ? { assignedToId: currentUserId } : undefined}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/dashboard/clients')}
            submitting={saving}
            submitLabel="Save Client"
            assignableUsers={assignableUsers}
            canAssign={canAssign}
            allowUnassigned={false}
          />
        </div>
      )}
    </div>
  );
}
