export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { describePlan, ensureTrialState } from '@/lib/plan';

type ClientPortalPageProps = {
  params: Promise<{ token?: string }>;
  searchParams: { token?: string | string[] };
};

export default async function ClientPortalPage({
  params,
  searchParams,
}: ClientPortalPageProps) {
  const resolvedParams = await params;
  const routeToken = resolvedParams?.token;
  const queryToken = Array.isArray(searchParams.token)
    ? searchParams.token[0]
    : searchParams.token;

  if (!routeToken && queryToken) {
    redirect(`/client/${encodeURIComponent(queryToken)}`);
  }

  const token = routeToken ?? queryToken;
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-950 to-purple-950 text-white">
        <p className="p-6 text-sm">Missing portal token. Please check the link we emailed you.</p>
      </div>
    );
  }

  const portalUser = await prisma.clientPortalUser.findFirst({
    where: { portalToken: token },
    include: {
      client: {
        include: {
          user: true,
          invoices: {
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!portalUser || !portalUser.client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-950 to-purple-950 text-white">
        <p className="p-6 text-sm">Invalid portal token.</p>
      </div>
    );
  }

  const canonicalUser = await ensureTrialState(portalUser.client.user);
  const plan = describePlan(canonicalUser);
  const hasStripeConfig = Boolean(
    canonicalUser.stripePublishableKey && canonicalUser.stripeAccountId
  );
  const alwaysPro = process.env.NEXT_PUBLIC_ALWAYS_PRO === 'true';
  const payOnlineEnabled = (plan.effectiveTier === 'PRO' && hasStripeConfig) || alwaysPro;
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.clientwave.app';

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 px-4 pt-10 pb-16 text-white">
      <div className="absolute inset-0 opacity-40">
        <div className="grid-overlay" />
      </div>
      <div className="relative w-full max-w-5xl space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Client portal</p>
          <h1 className="text-3xl font-semibold text-white">
            Welcome, {portalUser.client.contactName || portalUser.client.companyName || 'valued client'}
          </h1>
          <p className="text-sm text-white/70">
            View your invoices below. Download any invoice PDF with one click.
          </p>
        </div>

        <div className="rounded-3xl bg-white/5 p-6 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Invoices</h2>
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Secure</span>
          </div>
          <div className="mt-4 space-y-4">
            {portalUser.client.invoices.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/70">
                No invoices yet.
              </div>
            ) : (
              portalUser.client.invoices.map((invoice) => {
                const total = new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(Number(invoice.total ?? 0));
                return (
                  <div
                    key={invoice.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">Invoice #{invoice.invoiceNumber}</p>
                      <p className="text-xs text-white/60">
                        {invoice.status} · Issued {new Date(invoice.issueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-sm">
                      <span className="text-white/90">{total}</span>
              {invoice.shortCode && (
                <div className="flex flex-col gap-1 text-xs font-semibold">
                  <Link
                    href={`/p/${invoice.shortCode}/view`}
                    className="text-white/90 underline decoration-dotted"
                  >
                    View details
                  </Link>
                    {payOnlineEnabled ? (
                      <a
                        href={`${appBase}/p/${invoice.shortCode}`}
                        className="text-purple-200 underline decoration-dotted break-all"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Pay online: {`${appBase}/p/${invoice.shortCode}`}
                      </a>
                    ) : (
                      <span className="text-white/50 underline decoration-dotted line-through">
                        Pay online: {`${appBase}/p/${invoice.shortCode}`}
                      </span>
                    )}
                  <Link
                            href={`/p/${invoice.shortCode}/pdf`}
                            className="text-white/80 underline decoration-dotted"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Download PDF
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
