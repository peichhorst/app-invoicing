'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LineItemsEditor } from '@/components/invoicing/shared/LineItemsEditor';
import DocumentPreview from '@/components/invoicing/DocumentPreview';
import { type ClientOption } from '@/app/dashboard/(with-shell)/invoices/new/actions';
import { useClientOptions } from '@/components/invoicing/useClientOptions';
import { ClientSelect } from '@/components/invoicing/ClientSelect';
import { ClientForm, type ClientFormValues } from '@/components/ClientForm';

type LineItem = {
  description: string;
  quantity: number;
  rate: number;
};

type AssignableUserOption = { id: string; name: string | null; email: string | null };

export function NewProposalForm({
  documentType = 'PROPOSAL',
}: {
  documentType?: 'PROPOSAL' | 'CONTRACT';
}) {
  const documentLabel = documentType === 'CONTRACT' ? 'Contract' : 'Proposal';
  const router = useRouter();
  const { clients, loading: clientsLoading, error: clientsError } = useClientOptions();
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUserOption[]>([]);
  const [canAssignClients, setCanAssignClients] = useState(false);

  // Form fields
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState('');
  const [validUntil, setValidUntil] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { description: '', quantity: 1, rate: 0 },
  ]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);

  useEffect(() => {
    setClientOptions(clients);
  }, [clients]);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const role = (data?.user?.role ?? '').toUpperCase();
        const elevated = role === 'OWNER' || role === 'ADMIN';
        setCanAssignClients(elevated);
        if (!elevated) return;
        fetch('/api/company/members')
          .then(async (res) => {
            if (!res.ok) throw new Error(await res.text());
            return res.json();
          })
          .then((payload) => {
            if (!isMounted) return;
            setAssignableUsers(payload.members ?? []);
          })
          .catch((err) => {
            if (!isMounted) return;
            console.error('Failed to load assignable users', err);
            setAssignableUsers([]);
          });
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load current user', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddClient = async (values: ClientFormValues) => {
    setAddingClient(true);
    setError(null);
    try {
      const payload = {
        ...values,
        assignedToId: canAssignClients ? values.assignedToId ?? null : null,
      };
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to create client');
      }
      const newClient = await res.json();
      const option: ClientOption = {
        id: newClient.id,
        companyName: newClient.companyName ?? '',
        contactName: newClient.contactName ?? '',
      };
      setClientOptions((prev) => [option, ...prev]);
      setClientId(newClient.id);
      setSelectedClient(option);
      setShowNewClient(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add client');
    } finally {
      setAddingClient(false);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      return sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    }, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const handleSubmit = async (status: 'DRAFT' | 'SENT') => {
    setError(null);
    setSuccess(null);

    if (!clientId || !title.trim()) {
      setError('Please select a client and enter a title');
      return;
    }

    if (items.length === 0 || !items.every((item) => item.description.trim())) {
      setError('Please add at least one line item with a description');
      return;
    }

    setSaving(true);
    try {
      const total = calculateTotal();
      const normalizedItems = items.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        amount: (Number(item.quantity) || 0) * (Number(item.rate) || 0),
      }));

      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          title: title.trim(),
          description: description.trim() || null,
          scope: scope.trim() || null,
          validUntil: validUntil || null,
          notes: notes.trim() || null,
          items: normalizedItems,
          total,
          status,
          type: documentType,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to create proposal');
      }

      const result = await res.json();
      setSuccess(
        `${documentLabel} "${result.title}" ${status === 'SENT' ? 'sent' : 'saved as draft'} successfully!`,
      );
      
      setTimeout(() => {
        router.push('/dashboard/proposals-contracts');
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary-600">Proposals & Contracts</p>
          <h1 className="text-3xl font-semibold text-gray-900">Create a {documentLabel.toLowerCase()}</h1>
          <p className="text-sm text-gray-500">
            {documentType === 'CONTRACT'
              ? 'Legally binding service agreement'
              : 'Client must sign to accept'}
          </p>
        </div>
        <Link
          href="/dashboard/proposals-contracts"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          ← Back to proposals
        </Link>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Document Details */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">{documentLabel} Details</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
              <div className="flex-1">
                  <ClientSelect
                    value={clientId}
                    onChange={(value, client) => {
                      setClientId(value);
                      setSelectedClient(client);
                    }}
                    clients={clientOptions}
                    loading={clientsLoading}
                    label="Client"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewClient(true)}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-6 py-2 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)]"
                >
                  + Add New Client
                </button>
            </div>
            {clientsError && <p className="text-xs text-rose-500">{clientsError}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">
              {documentLabel} Title <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              placeholder="E.g. Brand refresh + marketing site"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
                placeholder="Brief overview of the proposal"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">Valid Until</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Scope of Work</label>
            <textarea
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              rows={5}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              placeholder="Describe scope, deliverables, and timeline highlights"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          {/* Line Items (shared component) */}
          <LineItemsEditor
            items={items}
            onAddItem={addItem}
            onRemoveItem={removeItem}
            onChangeItem={(index, field, value) => updateItem(index, field, value)}
            formatCurrency={formatCurrency}
          />

          {/* Additional Notes */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Additional Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              placeholder="Terms, conditions, or other information..."
            />
          </div>
        </div>

        <div className="mt-4 lg:mt-0">
          <DocumentPreview
            type={documentType === 'CONTRACT' ? 'contract' : 'proposal'}
            company={undefined}
            client={
              selectedClient
                ? {
                    name: selectedClient.companyName,
                    companyName: selectedClient.companyName,
                  }
                : undefined
            }
            lineItems={items.map((item) => ({
              description: item.description,
              quantity: Number(item.quantity) || 0,
              rate: Number(item.rate) || 0,
              amount: (Number(item.quantity) || 0) * (Number(item.rate) || 0),
            }))}
            totals={{
              subtotal: calculateTotal(),
              tax: 0,
              total: calculateTotal(),
            }}
            documentNumber={undefined}
            issueDate={validUntil ? new Date(validUntil) : undefined}
            dueDate={validUntil ? new Date(validUntil) : undefined}
            paymentTerms={notes || undefined}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => handleSubmit('DRAFT')}
          disabled={saving}
          className="rounded-lg border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          Save as draft
        </button>
        <button
          type="button"
          onClick={() => handleSubmit('SENT')}
          disabled={saving}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save & send'}
        </button>
      </div>

      {showNewClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Create Client</h3>
              <button
                type="button"
                className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 hover:text-zinc-700"
                onClick={() => setShowNewClient(false)}
              >
                Close
              </button>
            </div>
            <ClientForm
              onSubmit={handleAddClient}
              onCancel={() => setShowNewClient(false)}
              submitLabel="Create client"
              submitting={addingClient}
              assignableUsers={assignableUsers}
              canAssign={canAssignClients}
            />
          </div>
        </div>
      )}
    </div>
  );
}
