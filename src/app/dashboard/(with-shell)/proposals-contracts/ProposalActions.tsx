'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Eye, X } from 'lucide-react';
import Link from 'next/link';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

type ProposalStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'SIGNED' | 'COMPLETED' | 'DECLINED';

interface ProposalActionsProps {
  proposalId: string;
  status: ProposalStatus;
  documentType?: 'PROPOSAL' | 'CONTRACT';
}

const iconButtonClasses =
  'inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 transition hover:border-brand-primary-300 hover:text-brand-primary-700 disabled:opacity-50 disabled:cursor-not-allowed';

const successButton =
  'inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white p-2 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed';

export function ProposalActions({
  proposalId,
  status,
  documentType = 'PROPOSAL',
}: ProposalActionsProps) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const canComplete = status === 'SIGNED';

  const handleComplete = async () => {
    setBusyAction('Complete');
    try {
      const res = await fetch(`/api/proposals/${proposalId}/complete`, { method: 'POST' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Action failed');
      }

      const result = await res.json();
      alert(
        `Invoice #${result.invoiceNumber} generated successfully from the ${documentType === 'CONTRACT' ? 'contract' : 'proposal'}!`
      );
      router.refresh();
    } catch (error: any) {
      alert(error.message || 'Something went wrong');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = () => {
    startDelete(async () => {
      const res = await fetch(`/api/proposals/${proposalId}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to delete proposal.');
      }
    });
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
      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        disabled={isDeleting}
        className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Delete proposal"
      >
        <X className="h-4 w-4" />
      </button>
      {canComplete && (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!!busyAction}
          className={successButton}
          title={
            documentType === 'CONTRACT'
              ? 'Generate invoice from contract'
              : 'Mark as complete & generate invoice'
          }
        >
          <CheckCircle className="h-4 w-4" />
        </button>
      )}
      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleComplete}
        title={
          documentType === 'CONTRACT'
            ? 'Complete contract?'
            : 'Complete proposal?'
        }
        message={
          documentType === 'CONTRACT'
            ? 'Mark this contract as complete and generate an invoice?'
            : 'Mark this proposal as complete and generate an invoice?'
        }
        confirmText="Generate invoice"
        cancelText="Cancel"
      />
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={`Delete ${documentType === 'CONTRACT' ? 'contract' : 'proposal'}?`}
        message="Delete this document? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        align="center"
      />
    </div>
  );
}
