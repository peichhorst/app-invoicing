import React from 'react';
import DocumentHeader from '@/components/invoicing/shared/DocumentHeader';
import LineItemsTable from '@/components/invoicing/shared/LineItemsTable';
import TotalsSection from '@/components/invoicing/shared/TotalsSection';
import PaymentTermsFooter from '@/components/invoicing/shared/PaymentTermsFooter';

export type PreviewCompany = {
  name: string;
  logoUrl?: string;
  address?: string;
  email?: string;
  phone?: string;
};

export type PreviewClient = {
  name: string;
  companyName?: string;
  email?: string;
  address?: string;
};

export type PreviewLineItem = {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

export type PreviewTotals = {
  subtotal: number;
  tax?: number;
  taxRate?: number;
  discount?: number;
  total: number;
  currency?: string;
};

export interface DocumentPreviewProps {
  type: 'invoice' | 'proposal' | 'contract';
  company?: PreviewCompany;
  client?: PreviewClient;
  lineItems: PreviewLineItem[];
  totals: PreviewTotals;
  documentNumber?: string;
  issueDate?: Date;
  dueDate?: Date;
  paymentTerms?: string;
  notes?: string;
}

export default function DocumentPreview({
  type,
  company,
  client,
  lineItems,
  totals,
  documentNumber,
  issueDate,
  dueDate,
  paymentTerms,
  notes,
}: DocumentPreviewProps) {
  const hasContent =
    company || client || lineItems.length > 0 || totals.total > 0 || !!paymentTerms || !!notes;

  return (
    <div className="w-full">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Live preview
        </h2>
        <p className="text-xs text-gray-400">This is how your {type} will appear to clients.</p>
      </div>

      <div className="relative flex justify-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand-primary-50 via-white to-brand-primary-50" />
        <div className="relative w-full max-w-[900px] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
          <div className="mx-auto w-full max-w-[720px] px-6 py-6 sm:px-8 sm:py-8">
            {hasContent ? (
              <div className="space-y-8">
                <DocumentHeader
                  company={
                    company
                      ? {
                          name: company.name,
                          logo: company.logoUrl,
                          address: company.address,
                          email: company.email,
                          phone: company.phone,
                        }
                      : undefined
                  }
                  client={client}
                  documentNumber={documentNumber}
                  documentDate={issueDate}
                  dueDate={dueDate}
                  documentType={type}
                />

                {lineItems.length > 0 && <LineItemsTable items={lineItems} />}

                <TotalsSection
                  subtotal={totals.subtotal}
                  tax={totals.tax}
                  taxRate={totals.taxRate}
                  discount={totals.discount}
                  total={totals.total}
                  currency={totals.currency}
                />

                <PaymentTermsFooter
                  paymentTerms={paymentTerms}
                  notes={notes}
                  documentType={type}
                  dueDate={dueDate}
                />
              </div>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center text-sm text-gray-400">
                <p className="font-medium text-gray-500">Start filling out the form to see a preview.</p>
                <p className="mt-1 max-w-xs text-xs">
                  Company info, client details, line items, and totals will appear here as you type.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
