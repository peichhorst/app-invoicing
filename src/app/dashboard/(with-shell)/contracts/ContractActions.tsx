'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Trash2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface ContractActionsProps {
  contractId: string;
  status: string;
}

const iconButtonClasses =
  'inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 transition hover:border-brand-primary-300 hover:text-brand-primary-700 disabled:opacity-50 disabled:cursor-not-allowed';

const successButton =
  'inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white p-2 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed';

export function ContractActions({ contractId, status }: ContractActionsProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInvoiceConfirm, setShowInvoiceConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const canGenerateInvoice = status === 'signed';

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to delete contract.');
      }
    } catch (error) {
      alert('An error occurred while deleting the contract.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setBusyAction('Generating');
    try {
      const res = await fetch(`/api/contracts/${contractId}/generate-invoice`, { method: 'POST' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to generate invoice');
      }

      const result = await res.json();
      alert(`Invoice #${result.invoiceNumber} generated successfully from contract!`);
      router.refresh();
    } catch (error: any) {
      alert(error.message || 'Something went wrong');
    } finally {
      setBusyAction(null);
      setShowInvoiceConfirm(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/dashboard/contracts/${contractId}`}
          className={iconButtonClasses}
          title="View contract"
        >
          <Eye className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting || status === 'signed'}
          className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title={status === 'signed' ? 'Cannot delete signed contract' : 'Delete contract'}
        >
          <Trash2 className="h-4 w-4" />
        </button>
        {canGenerateInvoice && (
          <button
            onClick={() => setShowInvoiceConfirm(true)}
            disabled={!!busyAction}
            className={successButton}
            title="Generate invoice from contract"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete contract?"
        message="Are you sure you want to delete this contract? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        align="center"
      />
      <ConfirmationModal
        isOpen={showInvoiceConfirm}
        onClose={() => setShowInvoiceConfirm(false)}
        onConfirm={handleGenerateInvoice}
        title="Generate Invoice?"
        message="Generate an invoice from this signed contract? This will create a new invoice with the contract details."
        confirmText="Generate Invoice"
        cancelText="Cancel"
        align="center"
      />
    </>
  );
}
