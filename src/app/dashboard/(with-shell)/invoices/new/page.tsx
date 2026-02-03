'use client';

import { Suspense } from 'react';
import { DocumentEditor, type DocumentEditorConfig } from '@/components/invoicing/DocumentEditor';
import { createInvoiceAction } from './actions';
import { buildUnpaidInvoiceRequest } from './submit';

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 text-sm text-zinc-500">Loading invoice...</div>}>
      <CreateInvoiceContent />
    </Suspense>
  );
}

function CreateInvoiceContent() {
  const config: DocumentEditorConfig = {
    type: 'invoice',
    title: 'Create Invoice',
    subtitle: 'Select a client, add line items, and save your work as a draft or send the invoice immediately.',
    backHref: '/dashboard/invoices',
    enableRecurring: true,
    showTitle: true,
    enableTax: true,
    upgradeHref: '/payment?mode=subscription',
    onSubmit: async (values, status) => {
      if (status === 'UNPAID') {
        const requestConfig = buildUnpaidInvoiceRequest({
          isEdit: false,
          editId: null,
          body: { ...values, status },
        });

        const res = await fetch(requestConfig.url, requestConfig.options);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      } else {
        return createInvoiceAction({ ...values, status });
      }
    },
  };

  return <DocumentEditor config={config} />;
}
