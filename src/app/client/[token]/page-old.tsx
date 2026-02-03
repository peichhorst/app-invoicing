export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { describePlan, ensureTrialState } from '@/lib/plan';

import { ClientPortalTabs } from './ClientPortalTabs';

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


import { MessageSquare, FileText, Mail, LogOutIcon } from 'lucide-react';

const mainNav = [
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'proposals', label: 'Proposals', icon: MessageSquare },
  { id: 'messages', label: 'Messages', icon: Mail },
];

const mobileNav = [
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'proposals', label: 'Proposals', icon: MessageSquare },
  { id: 'messages', label: 'Messages', icon: Mail },
];

export default async function ClientPortalPage(props: ClientPortalPageProps) {
  const { token: routeToken } = await props.params;
  const sp = (await props.searchParams) ?? {};
  const queryToken = first(sp.token);

  if (!routeToken && queryToken) {
    redirect(`/client/${encodeURIComponent(queryToken)}`);
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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl gap-6 px-4 py-10 sm:px-8">
        <aside className="hidden md:flex h-min flex-col rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={companyLogo}
                alt={`${companyName} logo`}
                className="h-12 w-12 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-lg font-semibold text-zinc-700">
                {companyInitials}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-zinc-900">{companyName}</p>
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-zinc-500">Client portal</p>
            </div>
          </div>
          <nav className="mt-6 flex flex-col gap-2">
            {mainNav.map((item) => (
              <Link
                key={item.id}
                href={`#${item.id}`}
                className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-zinc-600 transition hover:border-brand-primary-300 hover:text-brand-primary-700"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto border-t border-zinc-200 pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-sm font-semibold text-brand-primary-700">
                {clientInitials}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">{clientName}</p>
                <p className="text-[0.65rem] uppercase tracking-[0.2em] text-zinc-500">Client</p>
              </div>
            </div>
            <form action="/api/auth/logout" method="post" className="mt-4">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-700 transition hover:border-zinc-300 hover:bg-white"
              >
                <LogOutIcon className="h-4 w-4" />
                Logout
              </button>
            </form>
          </div>
        </aside>
        <main className="flex-1 space-y-6">
          <section id="dashboard" className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-2xl">
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

          <section id="invoices" className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow">
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
                portalUser.client.invoices.map((invoice) => {
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
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 shadow-sm"
                    >
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          Invoice #{invoice.invoiceNumber}
                          <span className="ml-2 text-zinc-500">A$ {total}</span>
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

          <section id="proposals" className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow">
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

          <section id="payments" className="space-y-3 rounded-3xl border border-zinc-200 bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Payments</h2>
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">History</span>
            </div>
            <p className="text-sm text-zinc-500">Keep track of what you’ve paid and how to settle the next invoice.</p>
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

          <section id="documents" className="space-y-3 rounded-3xl border border-zinc-200 bg-white p-6 shadow">
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

          <section id="messages" className="space-y-3 rounded-3xl border border-zinc-200 bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Messages</h2>
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Conversations</span>
            </div>
            <p className="text-sm text-zinc-500">
              All correspondence from our team will live here. No messages yet, but we’ll notify you the moment someone replies.
            </p>
            <Link
              href="mailto:hello@clientwave.app?subject=Message%20from%20Portal"
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-brand-primary-700 transition hover:border-brand-primary-300"
            >
              Send us a message
            </Link>
          </section>

          <section id="account" className="space-y-3 rounded-3xl border border-zinc-200 bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Account</h2>
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Your profile</span>
            </div>
            <div className="space-y-2 text-sm text-zinc-500">
              {portalUser.client.email && (
                <p>
                  Email:{' '}
                  <Link href={`mailto:${portalUser.client.email}`} className="font-semibold text-zinc-900 underline">
                    {portalUser.client.email}
                  </Link>
                </p>
              )}
              {portalUser.client.phone && <p>Phone: {portalUser.client.phone}</p>}
              <p>Need to update your contact info? Just reply to any message and we’ll take care of it.</p>
            </div>
          </section>
        </main>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 flex items-center justify-between border-t border-zinc-200 bg-white/90 p-3 backdrop-blur md:hidden">
        {mobileNav.map((item) => (
          <Link
            key={item.id}
            href={`#${item.id}`}
            className="flex flex-1 flex-col items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-600"
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
