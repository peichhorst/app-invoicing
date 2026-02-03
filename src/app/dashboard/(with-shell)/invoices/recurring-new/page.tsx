'use client';

import { DocumentEditor, type DocumentEditorConfig } from '@/components/invoicing/DocumentEditor';
import { createRecurringInvoiceAction } from '../new/actions';

export default function CreateRecurringInvoicePage() {
  const config: DocumentEditorConfig = {
    type: 'recurring-invoice',
    title: 'Create Recurring Invoice',
    subtitle: 'Select a client, add line items, and save your work as a recurring invoice.',
    backHref: '/dashboard/invoices',
    alwaysRecurring: true,
    enableTax: true,
    onSubmit: async (values, status) => {
      return createRecurringInvoiceAction({ ...values, status });
    },
  };

  return <DocumentEditor config={config} />;
}
