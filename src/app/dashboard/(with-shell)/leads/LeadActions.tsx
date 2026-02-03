'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Trash2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface LeadActionsProps {
  leadId: string;
  status: string;
  hasClient: boolean;
}

const iconButtonClasses =
  'inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 transition hover:border-brand-primary-300 hover:text-brand-primary-700 disabled:opacity-50 disabled:cursor-not-allowed';

const convertButton =
  'inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white p-2 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed';

export function LeadActions({ leadId, status, hasClient }: LeadActionsProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const canConvert = status === 'qualified' && !hasClient;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to delete lead.');
      }
    } catch (error) {
      alert('An error occurred while deleting the lead.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConvertToClient = async () => {
    setBusyAction('Converting');
    try {
      const res = await fetch(`/api/leads/${leadId}/convert-to-client`, { method: 'POST' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to convert to client');
      }

      const result = await res.json();
      alert('Lead successfully converted to client!');
      // Redirect to the specific client page
      if (result.clientId) {
        router.push(`/dashboard/clients/${result.clientId}`);
      } else {
        router.push(`/dashboard/clients`);
      }
      router.refresh();
    } catch (error: any) {
      alert(error.message || 'Something went wrong');
    } finally {
      setBusyAction(null);
      setShowConvertConfirm(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/dashboard/leads/${leadId}`}
          className={iconButtonClasses}
          title="View lead"
        >
          <Eye className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting || hasClient}
          className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title={hasClient ? 'Cannot delete converted lead' : 'Delete lead'}
        >
          <Trash2 className="h-4 w-4" />
        </button>
        {canConvert && (
          <button
            onClick={() => setShowConvertConfirm(true)}
            disabled={!!busyAction}
            className={convertButton}
            title="Convert to client"
          >
            <UserPlus className="h-4 w-4" />
          </button>
        )}
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete lead?"
        message="This action cannot be undone. The lead will be permanently removed."
      />

      <ConfirmationModal
        isOpen={showConvertConfirm}
        onClose={() => setShowConvertConfirm(false)}
        onConfirm={handleConvertToClient}
        title="Convert to client?"
        message="This will create a new client record from this lead. Continue?"
      />
    </>
  );
}
