"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "lucide-react";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

type Props = {
  clientId: string;
  clientName: string;
  disabled?: boolean;
};

export default function DeleteClientButton({ clientId, clientName, disabled }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to delete client.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={disabled || isPending}
        className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 cursor-pointer disabled:opacity-60"
        title={disabled ? "Cannot delete client with invoices" : "Delete client"}
      >
        <Trash className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Delete</span>
      </button>
      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete client?"
        message={
          disabled
            ? `This client cannot be deleted because they have invoices. Please archive the client or remove all invoices first.`
            : `Delete ${clientName}? This will not affect invoices.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        align="center"
      />
    </>
  );
}
