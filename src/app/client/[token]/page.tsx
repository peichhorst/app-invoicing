
import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { describePlan, ensureTrialState } from '@/lib/plan';
import { MessageSquare } from 'lucide-react';
import { ClientPortalTabs } from './ClientPortalTabs';
import { useHighlightInvoice } from './highlightInvoice';


type ClientPortalPageProps = {
  params: Promise<{ token?: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);
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
      canonicalUser.stripePublishableKey && canonicalUser.stripeAccountId
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

    // All dashboard/invoices/proposals/payments/documents content is server-rendered
    const dashboardContent = (
      <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Client portal</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
          Welcome,
          <span className="text-brand-primary-700 ml-1">{clientName}</span>
          !
        </h1>
        <p className="text-sm text-zinc-500">
          View your invoices, download PDFs, and stay up to speed on what finances need your attention.
        </p>
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
                            href={`${appBase}/p/${invoice.shortCode}`}
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="#"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:border-brand-primary-300"
          >
            View pending proposals
          </Link>
          <Link
            href="#"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:border-brand-primary-300"
          >
            Download signed contracts
          </Link>
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
          <Link
            href="#"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:border-brand-primary-300"
          >
            View payment history
          </Link>
          <Link
            href="#"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:border-brand-primary-300"
          >
            Update payment method
          </Link>
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/api/exports/clients"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:border-brand-primary-300"
            target="_blank"
            rel="noreferrer"
          >
            Download statements
          </Link>
          <Link
            href="#"
            className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:border-brand-primary-300"
          >
            Shared files & links
          </Link>
        </div>
      </section>
    );
    return (
      <div className="min-h-screen bg-gray-50">
        <ClientPortalTabs
          companyName={companyName}
          companyInitials={companyInitials}
          companyLogo={companyLogo}
          clientName={clientName}
          clientInitials={clientInitials}
          children={{
            dashboard: dashboardContent,
            invoices: (
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
              </section>
            ),
            proposals: proposalsContent,
            payments: paymentsContent,
            documents: documentsContent,
          }}
        />
	  </div>
    );
}


