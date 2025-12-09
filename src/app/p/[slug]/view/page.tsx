import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { describePlan, ensureTrialState } from '@/lib/plan';

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
  const invoiceUser = canonicalUser;
  const venmoLink =
    invoiceUser?.venmoHandle && typeof invoiceUser.venmoHandle === 'string'
      ? `https://venmo.com/${invoiceUser.venmoHandle.replace(/^@/, '')}`
      : null;
  const mailToTargetText = invoiceUser?.mailToAddressTo?.trim();
  const mailRecipientName = mailToTargetText || invoiceUser?.companyName || invoiceUser?.name || 'Invoice sender';
  const mailToLines = [
    mailRecipientName,
    invoiceUser?.addressLine1,
    invoiceUser?.addressLine2,
    [invoiceUser?.city, invoiceUser?.state, invoiceUser?.postalCode].filter(Boolean).join(', '),
    invoiceUser?.country,
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
      <div className="relative w-full max-w-5xl space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="space-y-4 rounded-3xl bg-white/5 p-6 shadow-2xl shadow-black/50">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Invoice details</p>
              <h1 className="text-3xl font-semibold text-white">Invoice #{invoice.invoiceNumber}</h1>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-white/70">
                <span>Issued {issuedOn}</span>
                <span>Due {dueOn}</span>
                <span>Status: {invoice.status}</span>
              </div>
            </div>
            <div className="space-y-1 text-sm text-white/70">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Reference</p>
              <p className="font-semibold text-white">Shortcode: {shortCode}</p>
              {isPaid && paidOn && <p>Paid on {paidOn}</p>}
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 md:grid-cols-2">
            <div className="space-y-1 text-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Bill from</p>
                {[invoiceUser.companyName || 'Your company', invoiceUser.name, invoiceUser.email]
                .filter(Boolean)
                .map((line) => (
                  <p key={line}>{line}</p>
                ))}
              {invoiceUser.phone && <p>{invoiceUser.phone}</p>}
              {invoiceUser.addressLine1 && <p>{invoiceUser.addressLine1}</p>}
              {invoiceUser.addressLine2 && <p>{invoiceUser.addressLine2}</p>}
              <p className="text-white/70">
                {[invoiceUser.city, invoiceUser.state, invoiceUser.postalCode].filter(Boolean).join(', ') ||
                  invoiceUser.country}
              </p>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Bill to</p>
              <p className="text-base font-semibold text-white">{invoice.client.companyName}</p>
              {invoice.client.contactName && <p>{invoice.client.contactName}</p>}
              {invoice.client.email && <p>{invoice.client.email}</p>}
              {invoice.client.phone && <p>{invoice.client.phone}</p>}
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/10 text-sm">
            <table className="min-w-full text-left text-white">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-white/60">
                <tr>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Unit price</th>
                  <th className="px-4 py-3 text-right">Line total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => {
                  const qty = Number(item.quantity) || 0;
                  const unitPrice = Number(item.unitPrice) || 0;
                  const lineTotal = Number(item.total ?? qty * unitPrice);
                  return (
                    <tr key={item.id} className="border-t border-white/10">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{item.name}</p>
                        {item.description && <p className="text-xs text-white/60">{item.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-right">{qty}</td>
                      <td className="px-4 py-3 text-right">{currencyFormatter.format(unitPrice)}</td>
                      <td className="px-4 py-3 text-right">{currencyFormatter.format(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm md:justify-end">
            <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
              <span className="text-white/70">Subtotal</span>
              <span className="text-lg font-semibold text-white">{currencyFormatter.format(totals.subtotal)}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
              <span className="text-white/70">Tax</span>
              <span className="text-lg font-semibold text-white">{currencyFormatter.format(totals.tax)}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border border-purple-500/40 bg-purple-950/40 px-4 py-3 text-right">
              <span className="text-white/70">Total</span>
              <span className="text-2xl font-semibold text-white">{currencyFormatter.format(totals.total)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/80">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Notes</p>
              <p className="mt-1">{invoice.notes}</p>
            </div>
          )}

          {(payOnlineEnabled || showMailBlock || venmoLink || invoiceUser?.zelleHandle) && (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/80">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Payment</p>
              {payOnlineEnabled ? (
                <div className="flex flex-wrap items-center gap-2 text-white">
                  <span className="font-semibold text-white">Pay online:</span>
                  <a
                    href={payLink}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-purple-200 underline decoration-dotted"
                  >
                    {payLink}
                  </a>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-white/40">
                  <span className="font-semibold text-white/40 line-through decoration-dotted">Pay online</span>
                  <span className="truncate">{payLink}</span>
                </div>
              )}
              {showMailBlock && (
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">Mail check to</p>
                  {mailToLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
              {venmoLink && (
                <p className="text-white">
                  Venmo: <a href={venmoLink} className="text-purple-200 underline">{venmoLink}</a>
                </p>
              )}
              {invoiceUser?.zelleHandle && (
                <p className="text-white">
                  Zelle: <span className="font-semibold">{invoiceUser.zelleHandle}</span>
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            {portalToken && (
              <Link
                href={`/client/${encodeURIComponent(portalToken)}`}
                className="rounded-full border border-white/30 px-4 py-2 text-white transition hover:border-white"
              >
                Back to portal
              </Link>
            )}
            {payOnlineEnabled ? (
              <Link
                href={`/p/${shortCode}`}
                className="rounded-full border border-purple-300/60 px-4 py-2 text-xs font-semibold text-purple-200 transition hover:border-purple-100"
              >
                Pay online
              </Link>
            ) : (
              <span className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/40 line-through decoration-dotted">
                Pay online
              </span>
            )}
            <p className="text-xs text-white/60">Shortcode: {shortCode}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
