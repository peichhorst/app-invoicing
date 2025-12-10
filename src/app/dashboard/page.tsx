// src/app/dashboard/page.tsx
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { describePlan } from '@/lib/plan';
import { prisma } from '@lib/prisma';

const isValidUrl = (value?: string | null) => {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

type StripeCheckedUser = { stripeSubscriptionCheckError?: string };

export default async function Dashboard() {
  const user = await getCurrentUser();
  const showLogo = isValidUrl(user?.logoDataUrl);
  const plan = user ? describePlan(user) : null;
  const stripeCheckError = (user as StripeCheckedUser | null)?.stripeSubscriptionCheckError;
  const clients = await prisma.client.findMany({
    where: { userId: user?.id, archived: false },
  });
  const isPro = plan?.effectiveTier === 'PRO';
  const canCreateMoreClients = isPro || clients.length < 3;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-8">
        {stripeCheckError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span className="font-semibold">Payment check issue:</span> {stripeCheckError}
          </div>
        )}

        <div className="space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-zinc-900">Dashboard</h1>
              {clients.length === 0 ? (
                <div className="mt-2 flex flex-col gap-2 text-sm text-zinc-500">
                  <span>Start by creating your first client.</span>
                  {canCreateMoreClients ? (
                    <Link
                      href="/dashboard/clients/new"
                      className="text-sm font-semibold text-green-600 hover:text-green-700"
                    >
                      Create a client
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard/profile"
                      className="text-sm font-semibold text-purple-600 hover:text-purple-700"
                    >
                      Upgrade your plan to add more clients
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Quick links to manage clients and invoices.</p>
              )}
            </div>
          </div>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">Clients</p>
                <h2 className="text-2xl font-semibold text-zinc-900">Client workspace</h2>
                <p className="text-sm text-zinc-500">Add new people or review existing records quickly.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard/clients/new"
                  className="inline-flex items-center gap-2 rounded-full border border-purple-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-700 transition hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                  Add Client
                </Link>
                <Link
                  href="/dashboard/clients"
                  className="inline-flex items-center gap-2 rounded-full border border-purple-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-700 transition hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                  View Clients
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500">Invoices</p>
                <h2 className="text-2xl font-semibold text-zinc-900">Create & manage</h2>
                <p className="text-sm text-zinc-500">
                  Manage invoices, and recurring schedules.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/dashboard/invoices/new"
                  className="inline-flex items-center gap-2 rounded-full border border-purple-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-700 transition hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                  Create Invoice
                </Link>
                <Link
                  href="/dashboard/invoices"
                  className="inline-flex items-center gap-2 rounded-full border border-purple-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-700 transition hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                  View Invoices
                </Link>
                <Link
                  href="/dashboard/recurring"
                  className="inline-flex items-center gap-2 rounded-full border border-purple-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-700 transition hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                  Recurring Invoices
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
