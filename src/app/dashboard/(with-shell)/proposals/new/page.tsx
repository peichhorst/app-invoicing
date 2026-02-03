'use client';

import { DocumentEditor, type DocumentEditorConfig } from '@/components/invoicing/DocumentEditor';

export default function CreateProposalPage() {
  const config: DocumentEditorConfig = {
    type: 'proposal',
    title: 'Create Proposal',
    subtitle: 'Draft a proposal for your client with detailed scope and pricing.',
    backHref: '/dashboard/proposals',
    showTitle: true,
    showDescription: true,
    showScope: true,
    showValidUntil: true,
    enableTax: false,
    onSubmit: async (values, status) => {
      const total = values.items.reduce((sum: number, item: any) => {
        return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      }, 0);

      const normalizedItems = values.items.map((item: any) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity) || 0,
        rate: Number(item.unitPrice) || 0,
        amount: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
      }));

      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: values.clientId,
          title: values.title?.trim(),
          description: values.description?.trim() || null,
          scope: values.scope?.trim() || null,
          validUntil: values.validUntil || null,
          notes: values.notes?.trim() || null,
          items: normalizedItems,
          total,
          status,
          type: 'PROPOSAL',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to create proposal');
      }

      return res.json();
    },
  };

  return <DocumentEditor config={config} />;
}
