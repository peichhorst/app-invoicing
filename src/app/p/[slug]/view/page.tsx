import Link from 'next/link';
import prisma from '@/lib/prisma';
import { describePlan, ensureTrialState } from '@/lib/plan';
import type { Company } from '@prisma/client';
import SignProposalAction from './SignProposalAction';
import SignatureBlock from '@/components/invoicing/SignatureBlock';
import ProposalDetailsSection from '@/components/invoicing/ProposalDetailsSection';
import DocumentHeader from '@/components/invoicing/shared/DocumentHeader';
import LineItemsTable from '@/components/invoicing/shared/LineItemsTable';
import TotalsSection from '@/components/invoicing/shared/TotalsSection';
import PaymentTermsFooter from '@/components/invoicing/shared/PaymentTermsFooter';
import ProposalSignatureForm from './ProposalSignatureForm';

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
      <div className="min-h-screen bg-gradient-to-br from-brand-primary-900 via-brand-primary-950 to-brand-primary-950 text-white">
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
    return await renderProposalView(slug);
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
  const payOnlineAvailable = payOnlineEnabled && !isPaid;
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

  const invoiceClient = invoice.client;

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden bg-gradient-to-br from-brand-primary-700 via-brand-secondary-700 to-brand-accent-700 px-4 pt-10 pb-16 text-white">
      <div className="absolute inset-0 opacity-40">
        <div className="grid-overlay" />
      </div>
      <div className="relative w-full max-w-5xl space-y-6 rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Invoice Status</p>
              <p
                className={`inline-block rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] ${
                  isPaid ? 'bg-green-600 text-white' : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {isPaid ? 'PAID' : invoice.status}
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
              name: invoiceClient?.contactName || '',
              companyName: invoiceClient?.companyName || undefined,
              email: invoiceClient?.email || undefined,
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
            dueDate={invoice.dueDate ? new Date(invoice.dueDate) : undefined}
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
          {(showMailBlock || venmoLink || invoiceUser?.zelleHandle) && (
            <div className="space-y-4 rounded-lg border border-brand-primary-200 bg-brand-primary-50 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-primary-900">
                Payment Methods
              </h3>
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
                  <a href={venmoLink} className="text-sm text-brand-primary-600 underline" target="_blank" rel="noreferrer">
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
            {invoice.pdfUrl ? (
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Download Official PDF
              </a>
            ) : (
              <Link
                href={`/p/${shortCode}/pdf`}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Download PDF
              </Link>
            )}
            {payOnlineAvailable && (
              <Link
                href={`/p/${shortCode}`}
                className="rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-700"
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

async function renderProposalView(slug: string) {
  const proposal = await prisma.proposal.findFirst({
    where: { id: slug },
    include: {
      client: true,
      user: { include: { company: true } },
    },
  });

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-primary-900 via-brand-primary-950 to-brand-primary-950 text-white">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <p className="text-sm">We couldn't find a proposal with that link.</p>
        </div>
      </div>
    );
  }

  const rawItems = JSON.parse(typeof proposal.lineItems === 'string' ? proposal.lineItems : '[]');
  const parsedItems = Array.isArray(rawItems) ? rawItems : [];
  const lineItems = parsedItems.map((item: any) => ({
    description: [item.name, item.description].filter(Boolean).join('\n'),
    quantity: Number(item.quantity) || 0,
    rate: Number(item.rate) || 0,
    amount:
      Number(item.amount) ||
      (Number(item.quantity) || 0) * (Number(item.rate) || 0),
  }));
  const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const taxRate = Number(proposal.taxRate ?? 0);
  const taxAmount = taxRate > 0 ? subtotal * (taxRate / 100) : 0;
  const totals = {
    subtotal,
    tax: taxAmount,
    total: Number(proposal.total) || subtotal + taxAmount,
  };
  const currency = proposal.currency || 'USD';
  const companyContact = proposal.user;
  const companyPostal = [
    companyContact?.company?.addressLine1,
    companyContact?.company?.addressLine2,
  ]
    .filter(Boolean)
    .join('\n');
  const companyInfo = {
    name:
      companyContact?.company?.name ||
      companyContact?.companyName ||
      'Your Company',
    logo: companyContact?.company?.logoUrl || undefined,
    address: [
      companyContact?.company?.addressLine1,
      companyContact?.company?.addressLine2,
      [
        companyContact?.company?.city,
        companyContact?.company?.state,
        companyContact?.company?.postalCode,
      ]
        .filter(Boolean)
        .join(', '),
      companyContact?.company?.country,
    ]
      .filter(Boolean)
      .join('\n'),
    email: companyContact?.company?.email || companyContact?.email || undefined,
    phone: companyContact?.company?.phone || companyContact?.phone || undefined,
  };
  const clientInfo = {
    name: proposal.client?.contactName || '',
    companyName: proposal.client?.companyName || undefined,
    email: proposal.client?.email || undefined,
    address: undefined,
  };
  const status = proposal.status ?? 'UNKNOWN';
  const isSigned = ['SIGNED', 'COMPLETED'].includes(status);
  const signedOn = proposal.updatedAt
    ? new Date(proposal.updatedAt).toLocaleDateString()
    : null;
  const documentLabel = proposal.type === 'CONTRACT' ? 'Contract' : 'Proposal';
  const legalNote =
    proposal.type === 'CONTRACT'
      ? 'This is a legally binding agreement once you sign.'
      : undefined;

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden bg-gradient-to-br from-brand-primary-700 via-brand-secondary-700 to-brand-accent-700 px-4 pt-10 pb-16 text-white">
      <div className="absolute inset-0 opacity-40">
        <div className="grid-overlay" />
      </div>
      <div className="relative w-full max-w-5xl space-y-6 rounded-3xl border border-white/10 bg-white p-8 shadow-2xl text-zinc-900">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{documentLabel} status</p>
              <p
                className={`inline-block rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] ${
                  isSigned ? 'bg-green-600 text-white' : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {status}
              </p>
            </div>
            <div className="text-right text-sm text-zinc-600">
              <p>Document: <span className="font-semibold text-zinc-900">{proposal.id.slice(0, 8).toUpperCase()}</span></p>
              {isSigned && signedOn && (
                <p className="mt-1 text-green-600">Signed on {signedOn}</p>
              )}
            </div>
          </div>

          <DocumentHeader
            company={{
              name: companyInfo.name,
              logo: companyInfo.logo,
              address: companyInfo.address,
              email: companyInfo.email,
              phone: companyInfo.phone,
            }}
            client={{
              name: clientInfo.name,
              companyName: clientInfo.companyName,
              email: clientInfo.email,
              address: undefined,
            }}
            documentNumber={proposal.id.slice(0, 8).toUpperCase()}
            documentDate={proposal.createdAt ? new Date(proposal.createdAt) : undefined}
            dueDate={proposal.validUntil ? new Date(proposal.validUntil) : undefined}
            documentType={proposal.type === 'CONTRACT' ? 'contract' : 'proposal'}
          />

          <ProposalDetailsSection
            title={proposal.title}
            description={proposal.description}
            scope={proposal.scope}
            createdAt={proposal.createdAt}
            validUntil={proposal.validUntil}
            signedAt={proposal.signedAt}
            showTimeline
          />

          <LineItemsTable items={lineItems} />

          <TotalsSection subtotal={totals.subtotal} tax={totals.tax} total={totals.total} currency={currency} />

          <PaymentTermsFooter
            paymentTerms={proposal.notes || undefined}
            documentType={proposal.type === 'CONTRACT' ? 'contract' : 'proposal'}
            showThankYou={false}
          />
          {legalNote && (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800">
              {legalNote}
            </div>
          )}

          <ProposalSignatureForm
            proposalId={proposal.id}
            initialStatus={status}
            clientName={clientInfo.name || clientInfo.companyName || ''}
            signatureUrl={proposal.signatureUrl}
            signerName={clientInfo.name || clientInfo.companyName || ''}
            documentType={proposal.type}
          />
          {isSigned && (
            <SignatureBlock
              signedBy={proposal.client.contactName || proposal.client.companyName}
              signedAt={proposal.signedAt}
              signatureUrl={proposal.signatureUrl}
            />
          )}
          
          <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-6">
            {proposal.pdfUrl ? (
              <a
                href={proposal.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Download Official PDF
              </a>
            ) : (
              <Link
                href={`/p/${proposal.id}/pdf`}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Download PDF
              </Link>
            )}
          </div>
          
          <p className="text-center text-sm font-medium text-gray-500">
            Thank you for your business!
          </p>
        </div>
      </div>
    </div>
  );
}
