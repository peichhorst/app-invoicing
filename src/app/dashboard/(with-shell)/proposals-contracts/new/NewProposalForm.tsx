'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';

type ClientOption = {
  id: string;
  companyName: string;
};

type LineItem = {
  description: string;
  quantity: number;
  rate: number;
};

export function NewProposalForm() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    fetch('/api/clients')
      .then((res) => res.json())
      .then((data) => {
        setClients(data);
        setClientsLoading(false);
      })
      .catch(() => setClientsLoading(false));
  }, []);

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
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to create proposal');
      }

      const result = await res.json();
      setSuccess(`Proposal "${result.title}" ${status === 'SENT' ? 'sent' : 'saved as draft'} successfully!`);
      
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
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Proposals & Contracts</p>
          <h1 className="text-3xl font-semibold text-gray-900">Create a proposal</h1>
          <p className="text-sm text-gray-500">Start with the essentials and finish with pricing.</p>
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

      {/* Proposal Details */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Proposal Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700">Client *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={clientsLoading}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Proposal Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
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
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
                placeholder="Brief overview of the proposal"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700">Valid Until</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Scope of Work</label>
            <textarea
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              rows={5}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
              placeholder="Describe scope, deliverables, and timeline highlights"
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 rounded-lg border border-purple-200 px-3 py-1 text-sm font-semibold text-purple-700 transition hover:bg-purple-50"
          >
            <Plus className="h-4 w-4" />
            Add line item
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-100"
                  placeholder="Description"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-100"
                    placeholder="Qty"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={item.rate}
                    onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-100"
                    placeholder="Rate"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      {formatCurrency((item.quantity || 0) * (item.rate || 0))}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-2 border-t border-gray-200 pt-4">
          <div className="flex justify-end text-lg">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Subtotal</span>
                <span className="font-semibold text-gray-900">{formatCurrency(calculateTotal())}</span>
              </div>
              <div className="flex justify-between border-t-2 border-gray-300 pt-2">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-purple-600">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Additional Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
          placeholder="Terms, conditions, or other information..."
        />
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
    </div>
  );
}
