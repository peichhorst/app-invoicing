'use client';

import { X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

type DeleteUserButtonProps = {
  userId: string;
  userName: string;
  role?: string;
  className?: string;
};

export function DeleteUserButton({ userId, userName, role, className }: DeleteUserButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const isOwnerRole = role === 'OWNER';
  const warning = isOwnerRole
    ? 'Deleting an owner will remove this workspace and all its users. This cannot be undone.'
    : 'Remove this user from your workspace? This cannot be undone.';

  const handleDelete = () => {
    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
      } else {
        const errorPayload = await response.json().catch(() => null);
        alert(errorPayload?.error ?? 'Failed to delete user.');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className={`inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-60 ${className ?? ''}`}
        title={`Remove ${userName}`}
        aria-label={`Remove ${userName}`}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title={`Remove ${userName}?`}
        message={warning}
        confirmText="Remove"
        cancelText="Cancel"
      />
    </>
  );
}
