'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pause, Play, Trash2, DollarSign, Edit, Eye, X } from 'lucide-react';

export type RecurringStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CANCELLED';

interface RecurringActionsProps {
  recurringId: string;
  status: RecurringStatus;
  invoiceCount: number;
  latestInvoiceId?: string; // the actual invoice ID for mark paid
  latestInvoiceNumber?: string;
  invoiceNumber?: string;
}

const iconButtonClasses =
  'inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 transition hover:border-purple-300 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed';

const dangerIconButton =
  'inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white p-2 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed';

export function RecurringActions({
  recurringId,
  status,
  invoiceCount,
  latestInvoiceId,
  latestInvoiceNumber,
  invoiceNumber,
}: RecurringActionsProps) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const isCancelled = status === 'CANCELLED';
  const isPaused = status === 'PAUSED';
  const canPause = !isCancelled && status !== 'PENDING';
  const pauseLabel = isPaused ? 'Resume' : 'Pause';

  const request = async (url: string, method: 'POST' | 'DELETE' = 'POST', label: string) => {
    setBusyAction(label);
    try {
      const res = await fetch(url, { method });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Action failed');
      }

      router.refresh();
    } catch (error: any) {
      alert(error.message || 'Something went wrong');
    } finally {
      setBusyAction(null);
    }
  };

  const handlePauseResume = () => request(`/api/recurring/${recurringId}/pause`, 'POST', pauseLabel);
  const handleCancel = () => request(`/api/recurring/${recurringId}/cancel`, 'POST', 'Cancel');
  const handleDelete = () => {
    if (!confirm('Permanently delete this recurring invoice? This cannot be undone.')) return;
    request(`/api/recurring/${recurringId}`, 'DELETE', 'Delete');
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link 
        href={`/dashboard/recurring/${recurringId}/edit`} 
        className={iconButtonClasses}
        title="Edit"
      >
        <Edit className="h-4 w-4" />
      </Link>

      <Link 
        href={`/dashboard/invoices?recurring=${recurringId}`} 
        className={iconButtonClasses}
        title={`View ${invoiceCount} invoice${invoiceCount !== 1 ? 's' : ''}`}
      >
        <Eye className="h-4 w-4" />
      </Link>

      {canPause && (
        <button
          onClick={handlePauseResume}
          disabled={!!busyAction}
          className={iconButtonClasses}
          title={pauseLabel}
        >
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
      )}

      {!isCancelled && (
        <button
          onClick={handleCancel}
          disabled={!!busyAction}
          className={dangerIconButton}
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {(isPaused || isCancelled) && (
        <button
          onClick={handleDelete}
          disabled={!!busyAction}
          className={dangerIconButton}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
