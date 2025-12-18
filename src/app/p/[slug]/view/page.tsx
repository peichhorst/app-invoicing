import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { describePlan, ensureTrialState } from '@/lib/plan';
import type { Company } from '@prisma/client';
import SignProposalAction from './SignProposalAction';
import DocumentHeader from '@/components/invoicing/shared/DocumentHeader';
import LineItemsTable from '@/components/invoicing/shared/LineItemsTable';
import TotalsSection from '@/components/invoicing/shared/TotalsSection';
import PaymentTermsFooter from '@/components/invoicing/shared/PaymentTermsFooter';

type ViewInvoicePageProps = {
  params: Promise<{ slug?: string }>;
  searchParams?: Promise<{ slug?: string | string[] }>;
};

export default async function ViewInvoicePage({ params, searchParams }: ViewInvoicePageProps) {
  // Await both params and searchParams
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  
  const fallbackSlug =
    resolvedSearchParams && (Array.isArray(resolvedSearchParams.slug) 
      ? resolvedSearchParams.slug[0] 
      : resolvedSearchParams.slug);
  
  const slug = resolvedParams.slug ?? fallbackSlug;
  
  if (!slug) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-950 to-purple-950 text-white">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <p className="text-sm">Missing invoice identifier.</p>
        </div>
      </div>
    );
  }

  const invoice = await prisma.invoice.findFirst({
    where: { shortCode: slug },
    include: {
      items: { orderBy: { createdAt: 'asc' } },
      client: { include: { portalUser: true } },
      user: true,
    },
  });
  
  if (!invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-950 to-purple-950 text-white">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <p className="text-sm">We couldn't find an invoice with that link.</p>
        </div>
      </div>
    );
  }

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: invoice.currency ?? 'USD',
  });
  const canonicalUser = await ensureTrialState(invoice.user);
  type InvoiceUser = typeof canonicalUser & { company?: Company | null };
  const plan = describePlan(canonicalUser);
  const hasStripeConfig = Boolean(canonicalUser.stripePublishableKey && canonicalUser.stripeAccountId);
  const alwaysPro = process.env.NEXT_PUBLIC_ALWAYS_PRO === 'true';
  const payOnlineEnabled = (plan.effectiveTier === 'PRO' && hasStripeConfig) || alwaysPro;
  const portalToken = invoice.client?.portalUser?.portalToken;
  const shortCode = invoice.shortCode ?? slug;
  const issuedOn = invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : '—';
  const dueOn = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—';
  const isPaid = invoice.status === 'PAID';
  const paidOn = invoice.updatedAt ? new Date(invoice.updatedAt).toLocaleDateString() : null;
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.clientwave.app';
  const payLink = shortCode ? `${appBase}/p/${shortCode}` : `${appBase}/payment?seller=${invoice.userId}&invoice=${invoice.id}`;
  const invoiceUser = canonicalUser as InvoiceUser;
  const venmoLink =
    invoiceUser?.venmoHandle && typeof invoiceUser.venmoHandle === 'string'
      ? `https://venmo.com/${invoiceUser.venmoHandle.replace(/^@/, '')}`
      : null;
  const mailToTargetText = invoiceUser?.mailToAddressTo?.trim();
  const mailRecipientName =
    mailToTargetText || invoiceUser?.company?.name || invoiceUser?.companyName || invoiceUser?.name || 'Invoice sender';
  const mailToLines = [
    mailRecipientName,
    invoiceUser?.company?.addressLine1,
    invoiceUser?.company?.addressLine2,
    [invoiceUser?.company?.city, invoiceUser?.company?.state, invoiceUser?.company?.postalCode].filter(Boolean).join(', '),
    invoiceUser?.company?.country ?? 'USA',
  ].filter(Boolean);
  const showMailBlock = (invoiceUser?.mailToAddressEnabled ?? false) && mailToLines.length > 0;
  const totals = {
    subtotal: invoice.subTotal ?? 0,
    tax: invoice.taxAmount ?? 0,
    total: invoice.total ?? 0,
  };

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 px-4 pt-10 pb-16 text-white">
      <div className="absolute inset-0 opacity-40">
        <div className="grid-overlay" />
      </div>
      <div className="relative w-full max-w-5xl space-y-6 rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Invoice Status</p>
              <p className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {invoice.status}
              </p>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>Shortcode: <span className="font-semibold text-gray-900">{shortCode}</span></p>
              {isPaid && paidOn && <p className="mt-1 text-green-600">Paid on {paidOn}</p>}
            </div>
          </div>

          {/* Document Header Component */}
          <DocumentHeader
            company={{
              name: invoiceUser.company?.name || invoiceUser.companyName || 'Your Company',
              logo: invoiceUser.company?.logoUrl || undefined,
              address: [
                invoiceUser.company?.addressLine1,
                invoiceUser.company?.addressLine2,
                [invoiceUser.company?.city, invoiceUser.company?.state, invoiceUser.company?.postalCode]
                  .filter(Boolean)
                  .join(', '),
                invoiceUser.company?.country || 'USA',
              ].filter(Boolean).join('\n'),
              email: invoiceUser.email || undefined,
              phone: invoiceUser.phone || undefined,
            }}
            client={{
              name: invoice.client.contactName || '',
              companyName: invoice.client.companyName,
              email: invoice.client.email || undefined,
              address: undefined,
            }}
            documentNumber={invoice.invoiceNumber}
            documentDate={invoice.issueDate ? new Date(invoice.issueDate) : undefined}
            dueDate={invoice.dueDate ? new Date(invoice.dueDate) : undefined}
            documentType="invoice"
          />

          {/* Line Items Table Component */}
          <LineItemsTable
            items={invoice.items.map((item) => ({
              description: item.name + (item.description ? `\n${item.description}` : ''),
              quantity: Number(item.quantity) || 0,
              rate: Number(item.unitPrice) || 0,
              amount: Number(item.total ?? (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)),
            }))}
          />

          {/* Totals Section Component */}
          <TotalsSection
            subtotal={totals.subtotal}
            tax={totals.tax}
            total={totals.total}
            currency={invoice.currency ?? 'USD'}
          />

          {/* Payment Terms Footer Component */}
          <PaymentTermsFooter
            paymentTerms={invoice.notes || undefined}
            bankDetails={
              showMailBlock
                ? {
                    accountName: mailRecipientName,
                    bankName: 'Mail check to',
                  }
                : undefined
            }
            documentType="invoice"
          />

          {/* Invoice-Specific Payment Methods */}
          {(payOnlineEnabled || venmoLink || invoiceUser?.zelleHandle) && (
            <div className="space-y-4 rounded-lg border border-purple-200 bg-purple-50 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-purple-900">
                Payment Methods
              </h3>
              {payOnlineEnabled ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">Pay Online:</p>
                  <a
                    href={payLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block break-all rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                  >
                    {payLink}
                  </a>
                </div>
              ) : null}
              {showMailBlock && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">Mail Check To:</p>
                  <div className="text-sm text-gray-700">
                    {mailToLines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              )}
              {venmoLink && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">Venmo:</p>
                  <a href={venmoLink} className="text-sm text-purple-600 underline" target="_blank" rel="noreferrer">
                    {venmoLink}
                  </a>
                </div>
              )}
              {invoiceUser?.zelleHandle && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-900">Zelle:</p>
                  <p className="text-sm text-gray-700">{invoiceUser.zelleHandle}</p>
                </div>
              )}
            </div>
          )}

          <SignProposalAction slug={shortCode} initialStatus={invoice.status} />

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-6">
            {portalToken && (
              <Link
                href={`/client/${encodeURIComponent(portalToken)}`}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                ← Back to portal
              </Link>
            )}
            {payOnlineEnabled && (
              <Link
                href={`/p/${shortCode}`}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
              >
                Pay online
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
