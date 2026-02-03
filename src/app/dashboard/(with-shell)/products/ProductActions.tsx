'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Trash2 } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

const actionButtonClasses =
  'inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 transition hover:border-brand-primary-300 hover:text-brand-primary-700 disabled:opacity-50 disabled:cursor-not-allowed';

const dangerButtonClasses =
  'inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white p-2 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed';

export interface ProductActionsProps {
  id: string;
  slug: string;
}

export function ProductActions({ id, slug }: ProductActionsProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to archive product');
      }
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      alert(message);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/dashboard/products/${slug}`}
          className={actionButtonClasses}
          title="View product details"
        >
          <Eye className="h-4 w-4" />
        </Link>
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => setShowConfirm(true)}
          className={dangerButtonClasses}
          title="Archive product"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Archive product?"
        message="Archiving a product will mark it as ARCHIVED. It will still exist for historical invoices but no longer be public."
        confirmText="Archive"
        cancelText="Cancel"
        align="center"
      />
    </>
  );
}
