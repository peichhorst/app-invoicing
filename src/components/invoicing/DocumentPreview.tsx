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
  ipOwnership?: string;
  cancellationTerms?: string;
  liabilityCap?: string;
  governingLaw?: string;
  disputeResolution?: string;
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
  startDate?: Date;
  endDate?: Date;
  dueDate?: Date;
  paymentTerms?: string;
  notes?: string;
  proposalTitle?: string;
  proposalDescription?: string;
}

export default function DocumentPreview({
// ...existing code...
  type,
  company,
  client,
  lineItems,
  totals,
  documentNumber,
  issueDate,
  startDate,
  endDate,
  dueDate,
  paymentTerms,
  notes,
  proposalTitle,
  proposalDescription,
}: DocumentPreviewProps) {
  const hasContent =
    company || client || lineItems.length > 0 || totals.total > 0 || !!paymentTerms || !!notes;
  const hasLineItems = lineItems.some(
    (item) => item.description?.trim() || item.rate > 0 || item.amount > 0
  );
  const hasDocumentMeta =
    Boolean(proposalTitle?.trim()) ||
    Boolean(type === 'proposal' && proposalDescription?.trim()) ||
    Boolean(type === 'proposal' && notes?.trim()) ||
    Boolean(paymentTerms?.trim());


  return (
    <div className="w-full">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-primary-600">
          Live preview
        </h2>
        <p className="text-xs text-gray-400">This is how your {type} will appear to clients.</p>
      </div>

      <div className="relative flex justify-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand-primary-50 via-white to-brand-primary-50" />
        <div className="relative w-full max-w-[1900px] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
          <div className="mx-auto w-full max-w-[1200px] px-6 py-6 sm:px-8 sm:py-8">
            <div className="space-y-8">
              <DocumentHeader
                company={company}
                client={client}
                documentNumber={undefined}
                documentType={type}
                documentDate={type === 'contract' ? new Date() : issueDate}
                startDate={type === 'contract' ? startDate : undefined}
                endDate={type === 'contract' ? endDate : undefined}
                dueDate={dueDate}
              />

              {hasDocumentMeta && (
                <div className="space-y-2">
                  {proposalTitle && (
                    <div>
                      <span className="font-semibold">Title:</span> {proposalTitle}
                    </div>
                  )}
                  {type === 'proposal' && proposalDescription && (
                    <div>
                      <span className="font-semibold">Description:</span> {proposalDescription}
                    </div>
                  )}
                  {type === 'proposal' && notes && (
                    <div>
                      <span className="font-semibold">Scope of Work:</span> {notes}
                    </div>
                  )}
                  {paymentTerms && (
                    <div>
                      <span className="font-semibold">{type === 'proposal' ? 'Notes' : 'Terms & Conditions'}:</span> {paymentTerms}
                    </div>
                  )}
                </div>
              )}

              {hasLineItems && (
                <>
                  <LineItemsTable items={lineItems} />

                  <TotalsSection
                    subtotal={totals.subtotal ?? 0}
                    tax={totals.tax ?? 0}
                    taxRate={totals.taxRate ?? 0}
                    discount={totals.discount ?? 0}
                    total={totals.total ?? 0}
                    currency={totals.currency ?? 'USD'}
                  />
                </>
              )}

              {type === 'contract' && (
                <div className="space-y-2">
                  {company?.ipOwnership && (
                    <div>
                      <span className="font-semibold">IP Ownership:</span> {company.ipOwnership}
                    </div>
                  )}
                  {company?.cancellationTerms && (
                    <div>
                      <span className="font-semibold">Cancellation Terms:</span> {company.cancellationTerms}
                    </div>
                  )}
                  {company?.liabilityCap && (
                    <div>
                      <span className="font-semibold">Liability Cap:</span> {company.liabilityCap}
                    </div>
                  )}
                  {company?.governingLaw && (
                    <div>
                      <span className="font-semibold">Governing Law:</span> {company.governingLaw}
                    </div>
                  )}
                  {company?.disputeResolution && (
                    <div>
                      <span className="font-semibold">Dispute Resolution:</span> {company.disputeResolution}
                    </div>
                  )}
                </div>
              )}

          

              {type !== 'proposal' ? (
                <PaymentTermsFooter
                paymentTerms={paymentTerms}
                notes={notes}
                documentType={type}
                dueDate={dueDate}
              />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
