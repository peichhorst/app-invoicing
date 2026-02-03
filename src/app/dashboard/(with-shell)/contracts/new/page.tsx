'use client';

import { DocumentEditor, type DocumentEditorConfig } from '@/components/invoicing/DocumentEditor';

export default function NewContractPage() {
  const config: DocumentEditorConfig = {
    type: 'contract',
    title: 'Create Contract',
    subtitle: 'Draft a contract for your client with detailed terms and conditions.',
    backHref: '/dashboard/contracts',
    showTitle: true,
    showDescription: false,
    showScope: true,
    showValidUntil: false,
    enableTax: false,
    requireSignature: true,
    onSubmit: async (values, status) => {
      // Calculate total from items
      const total = values.items.reduce((sum: number, item: any) => {
        return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      }, 0);

      // Normalize items for contract
      const normalizedItems = values.items.map((item: any) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity) || 0,
        rate: Number(item.unitPrice) || 0,
        amount: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      }));

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: values.clientId,
          title: values.title?.trim(),
          scope: values.scope?.trim() || null,
          notes: values.notes?.trim() || null,
          items: normalizedItems,
          total,
          status,
          type: 'CONTRACT',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to create contract');
      }

      return res.json();
    },
  };

  return <DocumentEditor config={config} />;
}
