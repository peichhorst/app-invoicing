import React from 'react';
import DocumentHeader from '@/components/invoicing/shared/DocumentHeader';
import LineItemsTable from '@/components/invoicing/shared/LineItemsTable';
import TotalsSection from '@/components/invoicing/shared/TotalsSection';
import PaymentTermsFooter from '@/components/invoicing/shared/PaymentTermsFooter';
import { getNoPaymentMethodsMessage } from '@/lib/invoice-presentation';

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

export type PreviewPaymentMethods = {
  payOnlineEnabled?: boolean;
  payLink?: string;
  checkEnabled?: boolean;
  checkToLines?: string[];
  zelleHandle?: string;
  venmoHandle?: string;
  venmoQrUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
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
  recurringPaymentTerms?: string;
  notes?: string;
  proposalTitle?: string;
  proposalDescription?: string;
  paymentMethods?: PreviewPaymentMethods;
  showPoweredByClientWave?: boolean;
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
  recurringPaymentTerms,
  notes,
  proposalTitle,
  proposalDescription,
  paymentMethods,
  showPoweredByClientWave = false,
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
    Boolean(type !== 'invoice' && paymentTerms?.trim()) ||
    Boolean(type !== 'invoice' && recurringPaymentTerms?.trim());

  const hasPaymentMethods =
    Boolean(paymentMethods?.payOnlineEnabled) ||
    Boolean(paymentMethods?.checkEnabled && paymentMethods?.checkToLines?.some((line) => line.trim().length > 0)) ||
    Boolean(paymentMethods?.zelleHandle?.trim()) ||
    Boolean(paymentMethods?.venmoHandle?.trim());

  const checkToLines = (paymentMethods?.checkToLines ?? []).filter((line) => line.trim().length > 0);
  const showVenmoCard = Boolean(paymentMethods?.venmoHandle?.trim());
  const showZelleCard = Boolean(paymentMethods?.zelleHandle?.trim());
  const showCheckCard = Boolean(paymentMethods?.checkEnabled && checkToLines.length > 0);

  const noMethodsMessage = getNoPaymentMethodsMessage(
    paymentMethods?.contactPhone,
    paymentMethods?.contactEmail
  );

  return (
    <div className="w-full">
      {type === 'invoice' && (
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full border border-[var(--color-brand-logo-text)] bg-zinc-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase text-[var(--color-brand-logo-text)]">
            Invoice Preview
          </span>
        </div>
      )}
      <div className="relative flex justify-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-brand-primary-50 via-white to-brand-primary-50" />
        <div className="relative w-full max-w-[1900px] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
          <div className="mx-auto w-full max-w-[1200px] px-6 py-6 sm:px-8 sm:py-8">
            <div className="space-y-8">
              <DocumentHeader
                company={
                  company
                    ? {
                        ...company,
                        logo: company.logoUrl,
                      }
                    : undefined
                }
                client={client}
                documentNumber={documentNumber}
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
                      {proposalTitle}
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
                  {type !== 'invoice' && paymentTerms && (
                    <div>
                      <span className="font-semibold">{type === 'proposal' ? 'Notes' : 'Terms & Conditions'}:</span> {paymentTerms}
                    </div>
                  )}
                  {type !== 'invoice' && recurringPaymentTerms && (
                    <div>
                      <span className="font-semibold">Payment Terms:</span> {recurringPaymentTerms}
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

              {type === 'invoice' && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-700">
                    Payment Methods
                  </h3>
                  {(showVenmoCard || showZelleCard || showCheckCard) && (
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      {showVenmoCard && (
                        <div className="rounded-lg border border-zinc-200 bg-white p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700">Venmo</p>
                          <p className="mt-2 text-sm text-zinc-700">{paymentMethods?.venmoHandle}</p>
                          {paymentMethods?.venmoQrUrl && (
                            <img
                              src={paymentMethods.venmoQrUrl}
                              alt="Venmo QR code preview"
                              className="mt-2 h-16 w-16 rounded border border-zinc-200"
                            />
                          )}
                        </div>
                      )}

                      {showZelleCard && (
                        <div className="rounded-lg border border-zinc-200 bg-white p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700">Zelle</p>
                          <p className="mt-2 text-sm text-zinc-700">{paymentMethods?.zelleHandle}</p>
                        </div>
                      )}

                      {showCheckCard && (
                        <div className="rounded-lg border border-zinc-200 bg-white p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-700">Check</p>
                          <div className="mt-2 space-y-1 text-sm text-zinc-700">
                            {checkToLines.map((line) => (
                              <p key={line}>{line}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMethods?.payOnlineEnabled && (
                    <div className="mt-3">
                      {paymentMethods.payLink ? (
                        <a
                          href={paymentMethods.payLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-md border border-brand-primary-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                        >
                          Click Here to Pay Invoice Online
                        </a>
                      ) : (
                        <span className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 shadow-sm">
                          Click Here to Pay Invoice Online
                        </span>
                      )}
                      {!paymentMethods.payLink ? (
                        <p className="mt-2 text-xs text-zinc-500">Payment link will be generated when sent.</p>
                      ) : null}
                    </div>
                  )}

                  {!hasPaymentMethods && (
                    <p className="mt-3 text-sm text-zinc-600">{noMethodsMessage}</p>
                  )}
                </div>
              )}

          

              {type !== 'proposal' ? (
                <PaymentTermsFooter
                paymentTerms={type === 'invoice' ? undefined : paymentTerms}
                notes={type === 'invoice' ? (notes?.trim() ? notes : 'No notes added.') : notes}
                documentType={type}
                dueDate={type === 'invoice' ? undefined : dueDate}
                showPoweredByClientWave={showPoweredByClientWave}
              />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
