
import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { describePlan, ensureTrialState } from '@/lib/plan';
import { isPastDueDateByDay } from '@/lib/date-status';
import type { CSSProperties } from 'react';
import { ClientPortalTabs } from './ClientPortalTabs';


type ClientPortalPageProps = {
  params: Promise<{ token?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
const getInitials = (value?: string | null) => {
  if (!value) return 'C';
  const cleaned = value.trim();
  if (!cleaned) return 'C';
  const parts = cleaned.split(/[^A-Za-z0-9]/).filter(Boolean);
  if (!parts.length) return cleaned.charAt(0).toUpperCase();
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

const resolveBrandColor = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const colorMap: Record<string, string> = {
    purple: '#a855f7',
    blue: '#1d4ed8',
    green: '#22c55e',
    red: '#ef4444',
  };
  return colorMap[normalized] || value;
};

const buildBrandStyle = (value?: string | null): CSSProperties => {
  const brand = resolveBrandColor(value);
  if (!brand) return {};
  return {
    ['--color-brand-primary-500' as any]: brand,
    ['--color-brand-primary-600' as any]: brand,
    ['--color-brand-primary-700' as any]: brand,
    ['--color-brand-accent-500' as any]: brand,
    ['--color-brand-accent-600' as any]: brand,
    ['--color-brand-accent-700' as any]: brand,
  } as CSSProperties;
};

export default async function ClientPortalPage({ params, searchParams }: ClientPortalPageProps) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const routeToken = resolvedParams?.token;
    const queryToken = first(resolvedSearchParams.token);
    if (!routeToken && queryToken) {
      redirect(`/client/${encodeURIComponent(queryToken)}`);
      return null;
    }
    const token = routeToken ?? queryToken;
    if (!token) {
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10 text-sm text-gray-600">
            Missing portal token. Please check the link we emailed you.
          </div>
        </div>
      );
    }
    const portalUser = await prisma.clientPortalUser.findFirst({
      where: { portalToken: token },
      include: {
        client: {
          include: {
            company: { include: { owner: true } },
            invoices: {
              orderBy: { createdAt: 'desc' },
              include: { user: true },
            },
          },
        },
      },
    });
    if (!portalUser || !portalUser.client) {
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10 text-sm text-gray-600">
            Invalid portal token.
          </div>
        </div>
      );
    }
    const canonicalUser = await ensureTrialState(
      portalUser.client.invoices[0]?.user ?? portalUser.client.company.owner
    );
    const plan = describePlan(canonicalUser);
    const hasStripeConfig = Boolean(
      canonicalUser.company?.stripePublishableKey &&
        canonicalUser.company?.stripeAccountId
    );
    const alwaysPro = process.env.NEXT_PUBLIC_ALWAYS_PRO === 'true';
    const payOnlineEnabled = (plan.effectiveTier === 'PRO' && hasStripeConfig) || alwaysPro;
    const appBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.clientwave.app';
    const company = portalUser.client.company;
    const companyName = company?.name ?? 'Your company';
    const clientName =
      portalUser.client.contactName ||
      portalUser.client.companyName ||
      portalUser.client.email ||
      'Valued client';
    const companyInitials = getInitials(companyName);
    const clientInitials = getInitials(clientName);
    const companyLogo = company?.logoUrl;
    const portalBrandStyle = buildBrandStyle(company?.primaryColor ?? null);
    const invoices = portalUser.client.invoices ?? [];
    const settledStatuses = new Set(['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED']);
    const openInvoices = invoices.filter((invoice: any) => !settledStatuses.has(String(invoice.status ?? '')));
    const paidInvoices = invoices.filter((invoice: any) => String(invoice.status ?? '') === 'PAID');
    const overdueInvoices = openInvoices.filter((invoice: any) => {
      if (!invoice?.dueDate) return false;
      return isPastDueDateByDay(invoice.dueDate, new Date());
    });
    const totalOutstanding = openInvoices.reduce((sum: number, invoice: any) => {
      const total = Number(invoice?.total ?? 0);
      const paid = Number(invoice?.amountPaid ?? 0);
      return sum + Math.max(0, total - paid);
    }, 0);
    const nextDueInvoice = [...openInvoices]
      .filter((invoice: any) => Boolean(invoice?.dueDate))
      .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    const recentInvoices = invoices.slice(0, 4);
    const latestInvoice = invoices[0];
    const latestInvoiceViewHref = latestInvoice?.shortCode ? `/p/${latestInvoice.shortCode}/view` : null;
    const latestInvoicePdfHref = latestInvoice?.shortCode ? `/p/${latestInvoice.shortCode}/pdf` : null;
    const nextDuePayHref =
      payOnlineEnabled && nextDueInvoice?.id
        ? `${appBase}/payment?seller=${nextDueInvoice.userId}&invoice=${nextDueInvoice.id}`
        : null;
    const supportEmail =
      company?.email ??
      canonicalUser.company?.email ??
      canonicalUser.email ??
      null;
    const quickActionLinkClass =
      'inline-flex items-center justify-center rounded-lg border border-brand-primary-300 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary-700 transition hover:border-brand-primary-500 hover:bg-brand-primary-50';
    const quickActionMutedClass =
      'inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500';

    // All dashboard/invoices/proposals/payments/documents content is server-rendered
    const dashboardContent = (
      <section className="space-y-5 rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Client portal</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
            Welcome,
            <span className="ml-1 text-brand-primary-700">{clientName}</span>!
          </h1>
          <p className="text-sm text-zinc-500">
            Here is a quick snapshot of what needs attention right now.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Open invoices</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">{openInvoices.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Outstanding</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">{currencyFormatter.format(totalOutstanding)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Overdue</p>
            <p className="mt-1 text-2xl font-semibold text-rose-600">{overdueInvoices.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Paid invoices</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">{paidInvoices.length}</p>
          </div>
        </div>

        {nextDueInvoice ? (
          <div className="rounded-2xl border border-brand-primary-200 bg-brand-primary-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary-700">Next due</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  Invoice #{nextDueInvoice.invoiceNumber} - {currencyFormatter.format(Number(nextDueInvoice.total ?? 0))}
                </p>
                <p className="text-xs text-zinc-600">
                  Due {nextDueInvoice.dueDate ? new Date(nextDueInvoice.dueDate).toLocaleDateString() : 'soon'}
                </p>
              </div>
              {payOnlineEnabled && nextDueInvoice.id ? (
                <a
                  href={`${appBase}/payment?seller=${nextDueInvoice.userId}&invoice=${nextDueInvoice.id}`}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-primary-700"
                  target="_blank"
                  rel="noreferrer"
                >
                  Pay now
                </a>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            You are all caught up. No open invoices right now.
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Recent activity</p>
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-zinc-500">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2"
                >
                  <div className="text-sm">
                    <p className="font-semibold text-zinc-900">Invoice #{invoice.invoiceNumber}</p>
                    <p className="text-xs text-zinc-500">
                      {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : 'No issue date'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900">
                      {currencyFormatter.format(Number(invoice.total ?? 0))}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                        String(invoice.status ?? '') === 'PAID'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-brand-primary-600 text-white'
                      }`}
                    >
                      {String(invoice.status ?? '')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Quick actions</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {latestInvoiceViewHref ? (
              <Link href={latestInvoiceViewHref} className={quickActionLinkClass}>
                Open latest invoice
              </Link>
            ) : (
              <span className={quickActionMutedClass}>No invoices yet</span>
            )}
            {nextDuePayHref ? (
              <a href={nextDuePayHref} target="_blank" rel="noreferrer" className={quickActionLinkClass}>
                Pay next due
              </a>
            ) : (
              <span className={quickActionMutedClass}>No payment due</span>
            )}
            {latestInvoicePdfHref ? (
              <Link href={latestInvoicePdfHref} className={quickActionLinkClass} target="_blank" rel="noreferrer">
                Download latest PDF
              </Link>
            ) : (
              <span className={quickActionMutedClass}>No documents yet</span>
            )}
          </div>
        </div>
      </section>
    );
    const invoicesContent = (
      <section className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Your Invoices</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Secure</span>
        </div>
        <div className="mt-4 space-y-4">
          {portalUser.client.invoices.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
              No invoices yet.
            </div>
          ) : (
            portalUser.client.invoices.map((invoice: any) => {
              const total = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(Number(invoice.total ?? 0));
              const isPaid = invoice.status === 'PAID';
              const payOnlineAvailable = payOnlineEnabled && !isPaid;
              const issuedDate = invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : '';
              return (
                <div
                  key={invoice.id}
                  data-invoice-id={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      Invoice #{invoice.invoiceNumber}
                      <span className="ml-2 text-zinc-500">{total}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold uppercase tracking-[0.2em] ${
                          isPaid ? 'bg-emerald-500 text-white' : 'bg-brand-primary-600 text-white'
                        }`}
                      >
                        {isPaid ? 'Paid' : invoice.status}
                      </span>
                      {isPaid && invoice.updatedAt ? (
                        <span className="font-semibold text-zinc-900">
                          {new Date(invoice.updatedAt).toLocaleDateString()}
                        </span>
                      ) : (
                        issuedDate && <span className="text-zinc-500">Issued {issuedDate}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-sm">
                    <span className="text-zinc-900">{total}</span>
                    {invoice.shortCode && (
                      <div className="flex flex-col gap-1 text-xs font-semibold">
                        <Link
                          href={`/p/${invoice.shortCode}/view`}
                          className="text-brand-primary-700 underline decoration-dotted"
                        >
                          View details
                        </Link>
                        <Link
                          href={`/p/${invoice.shortCode}/pdf`}
                          className="text-zinc-500 underline decoration-dotted"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download PDF
                        </Link>
                        {payOnlineAvailable && (
                          <a
                            href={`${appBase}/payment?seller=${invoice.userId}&invoice=${invoice.id}`}
                            className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-3 py-1.5 text-white transition hover:bg-brand-primary-700"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Pay online
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Quick actions</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {nextDuePayHref ? (
              <a href={nextDuePayHref} target="_blank" rel="noreferrer" className={quickActionLinkClass}>
                Pay next due
              </a>
            ) : (
              <span className={quickActionMutedClass}>No payment due</span>
            )}
            {latestInvoiceViewHref ? (
              <Link href={latestInvoiceViewHref} className={quickActionLinkClass}>
                Open latest invoice
              </Link>
            ) : (
              <span className={quickActionMutedClass}>No invoices yet</span>
            )}
            {latestInvoicePdfHref ? (
              <Link href={latestInvoicePdfHref} className={quickActionLinkClass} target="_blank" rel="noreferrer">
                Download latest PDF
              </Link>
            ) : (
              <span className={quickActionMutedClass}>No documents yet</span>
            )}
          </div>
        </div>
      </section>
    );
    const proposalsContent = (
      <section className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Proposals & Contracts</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Sent & signed</span>
        </div>
        <p className="text-sm text-zinc-500">
          We send proposals directly to this space. Once you approve, you can download the signed copy immediately.
        </p>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          Proposal and contract sharing is enabled per account workflow. If you need a copy, use the quick actions below.
        </div>
        <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Quick actions</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {latestInvoiceViewHref ? (
              <Link href={latestInvoiceViewHref} className={quickActionLinkClass}>
                Open latest document
              </Link>
            ) : (
              <span className={quickActionMutedClass}>No documents yet</span>
            )}
            {latestInvoiceViewHref ? (
              <Link href={latestInvoiceViewHref} className={quickActionLinkClass}>
                View invoices
              </Link>
            ) : (
              <span className={quickActionMutedClass}>No invoices yet</span>
            )}
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} className={quickActionLinkClass}>
                Request proposal copy
              </a>
            ) : (
              <span className={quickActionMutedClass}>Support unavailable</span>
            )}
          </div>
        </div>
      </section>
    );
    const paymentsContent = (
      <section className="space-y-3 rounded-3xl border border-zinc-200 bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Payments</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">History</span>
        </div>
        <p className="text-sm text-zinc-500">Keep track of what you've paid and how to settle the next invoice.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Outstanding balance</p>
            <p className="mt-1 text-xl font-semibold text-zinc-900">{currencyFormatter.format(totalOutstanding)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Paid invoices</p>
            <p className="mt-1 text-xl font-semibold text-emerald-600">{paidInvoices.length}</p>
          </div>
        </div>
        <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Quick actions</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {nextDuePayHref ? (
              <a href={nextDuePayHref} target="_blank" rel="noreferrer" className={quickActionLinkClass}>
                Pay outstanding
              </a>
            ) : (
              <span className={quickActionMutedClass}>No payment due</span>
            )}
            {latestInvoiceViewHref ? (
              <Link href={latestInvoiceViewHref} className={quickActionLinkClass}>
                View payment source
              </Link>
            ) : (
              <span className={quickActionMutedClass}>No invoices yet</span>
            )}
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} className={quickActionLinkClass}>
                Contact billing
              </a>
            ) : (
              <span className={quickActionMutedClass}>Support unavailable</span>
            )}
          </div>
        </div>
      </section>
    );
    const documentsContent = (
      <section className="space-y-3 rounded-3xl border border-zinc-200 bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Documents</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">PDFs</span>
        </div>
        <p className="text-sm text-zinc-500">
          Download invoices, proposals, and shared files without opening attachments.
        </p>
        <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Quick actions</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {latestInvoicePdfHref ? (
              <Link
                href={latestInvoicePdfHref}
                className={quickActionLinkClass}
                target="_blank"
                rel="noreferrer"
              >
                Download latest PDF
              </Link>
            ) : (
              <span className={quickActionMutedClass}>No documents yet</span>
            )}
            {latestInvoiceViewHref ? (
              <Link href={latestInvoiceViewHref} className={quickActionLinkClass}>
                Open latest invoice
              </Link>
            ) : (
              <span className={quickActionMutedClass}>No invoices yet</span>
            )}
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} className={quickActionLinkClass}>
                Request a document
              </a>
            ) : (
              <span className={quickActionMutedClass}>Support unavailable</span>
            )}
          </div>
        </div>
      </section>
    );
    return (
      <div className="min-h-screen bg-gray-50" style={portalBrandStyle}>
        <ClientPortalTabs
          companyName={companyName}
          companyInitials={companyInitials}
          companyLogo={companyLogo}
          clientName={clientName}
          clientInitials={clientInitials}
          children={{
            dashboard: dashboardContent,
            invoices: invoicesContent,
            proposals: proposalsContent,
            payments: paymentsContent,
            documents: documentsContent,
          }}
        />
	  </div>
    );
}


