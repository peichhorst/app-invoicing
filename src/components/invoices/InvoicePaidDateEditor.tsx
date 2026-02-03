'use client';

import { useState } from 'react';

type InvoicePaidDateEditorProps = {
  invoiceId: string;
  initialPaidAt?: string | null;
};

const toLocalInputValue = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const formatDisplayValue = (iso?: string | null) => {
  if (!iso) return 'Not paid yet';
  return new Date(iso).toLocaleString();
};

export default function InvoicePaidDateEditor({
  invoiceId,
  initialPaidAt,
}: InvoicePaidDateEditorProps) {
  const [paidAt, setPaidAt] = useState<string | null>(initialPaidAt ?? null);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(toLocalInputValue(initialPaidAt));
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setInputValue(toLocalInputValue(paidAt));
    setEditing(true);
  };

  const handleSave = async () => {
    if (!inputValue) return;
    setSaving(true);
    try {
      const payload = {
        paidAt: new Date(inputValue).toISOString(),
      };
      const response = await fetch(`/api/invoices/${invoiceId}/paid-date`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => 'Unable to parse response');
        throw new Error(`Unable to update paid date: ${response.status} ${text}`);
      }
      const result = await response.json();
      setPaidAt(result.paidAt);
      setEditing(false);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (!paidAt && !editing) {
    return <span className="text-xs text-zinc-500">Not paid yet</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {editing ? (
        <div className="flex flex-wrap items-center gap-1">
          <input
            type="datetime-local"
            className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-700"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-brand-primary-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={saving}
            className="rounded border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-zinc-700">
          <span className="text-xs font-semibold text-zinc-900">{formatDisplayValue(paidAt)}</span>
          <button
            type="button"
            onClick={startEditing}
            className="text-xs font-semibold text-brand-primary-600 hover:text-brand-primary-700"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
