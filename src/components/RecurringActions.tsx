'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pause, Play, Trash2, DollarSign, Edit, Eye } from 'lucide-react';

export type RecurringStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CANCELLED';

interface RecurringActionsProps {
  recurringId: string;
  status: RecurringStatus;
  invoiceCount: number;
  invoiceNumber?: string;
}

const actionButtonClasses =
  'inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700 transition hover:border-purple-200 hover:text-purple-700';
const dangerButton =
  'inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 transition hover:bg-rose-50';

export function RecurringActions({ recurringId, status, invoiceCount, invoiceNumber }: RecurringActionsProps) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const isCancelled = status === 'CANCELLED';
  const isPaused = status === 'PAUSED';
  const canPause = !isCancelled;
  const pauseLabel = isPaused ? 'Resume' : 'Pause';
  const canMarkPaid = status === 'PENDING';

  const request = async (url: string, method: 'POST' | 'DELETE', label: string) => {
    setBusyAction(label);
    try {
      const res = await fetch(url, { method });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Action failed');
      }
      router.refresh();
    } catch (error: any) {
      window.alert(error?.message || 'Action failed');
    } finally {
      setBusyAction(null);
    }
  };

  const handlePauseResume = () => request(`/api/recurring/${recurringId}/pause`, 'POST', pauseLabel);
  const handleMarkPaid = () => request(`/api/recurring/${recurringId}/mark-paid`, 'POST', 'Mark paid');
  const handleCancel = () => request(`/api/recurring/${recurringId}/cancel`, 'POST', 'Cancel');
  const handleDelete = () => request(`/api/recurring/${recurringId}`, 'DELETE', 'Delete');

  const viewInvoiceLabel = invoiceNumber ? `Invoice #${invoiceNumber}` : 'View invoices';

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link href={`/dashboard/recurring/${recurringId}/edit`} className={actionButtonClasses}>
        <Edit className="h-3.5 w-3.5" />
        Edit
      </Link>
   
      {canPause && (
        <button
          type="button"
          onClick={handlePauseResume}
          disabled={busyAction !== null}
          className={actionButtonClasses}
        >
          {status === 'PAUSED' ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          {pauseLabel}
        </button>
      )}
      {canMarkPaid && (
        <button
          type="button"
          onClick={handleMarkPaid}
          disabled={busyAction !== null}
          className={actionButtonClasses}
        >
          <DollarSign className="h-3.5 w-3.5" />
          Mark paid
        </button>
      )}
      {!isCancelled && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={busyAction !== null}
          className={dangerButton}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Cancel
        </button>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={busyAction !== null}
        className={dangerButton}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
    </div>
  );
}
