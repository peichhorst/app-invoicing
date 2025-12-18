'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Eye } from 'lucide-react';
import Link from 'next/link';

type ProposalStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'SIGNED' | 'COMPLETED' | 'DECLINED';

interface ProposalActionsProps {
  proposalId: string;
  status: ProposalStatus;
}

const iconButtonClasses =
  'inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 transition hover:border-purple-300 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed';

const successButton =
  'inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white p-2 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed';

export function ProposalActions({ proposalId, status }: ProposalActionsProps) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const canComplete = status === 'SIGNED';

  const handleComplete = async () => {
    if (!confirm('Mark this proposal as complete and generate an invoice?')) return;

    setBusyAction('Complete');
    try {
      const res = await fetch(`/api/proposals/${proposalId}/complete`, { method: 'POST' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Action failed');
      }

      const result = await res.json();
      alert(`Invoice #${result.invoiceNumber} generated successfully!`);
      router.refresh();
    } catch (error: any) {
      alert(error.message || 'Something went wrong');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Link
        href={`/dashboard/proposals-contracts/${proposalId}`}
        className={iconButtonClasses}
        title="View proposal"
      >
        <Eye className="h-4 w-4" />
      </Link>
      {canComplete && (
        <button
          onClick={handleComplete}
          disabled={!!busyAction}
          className={successButton}
          title="Mark as complete & generate invoice"
        >
          <CheckCircle className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
