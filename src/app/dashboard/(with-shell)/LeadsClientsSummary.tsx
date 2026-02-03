import prisma from '@/lib/prisma';
import { Users, UserPlus, User, FileText, Repeat } from 'lucide-react';
import { TotalRevenueSection } from '@/components/TotalRevenueSection';
import type { RevenueDebugData } from '@/types/revenue';
import React from 'react';

type Props = {
  companyId?: string;
  totalRevenueDebug?: RevenueDebugData | null;
};

export default async function LeadsClientsSummary({ companyId, totalRevenueDebug }: Props) {
  if (!companyId) return null;
  const [
    leadsCount,
    clientsCount,
    teamCount,
    proposalsCount,
    contractsCount,
    invoicesCount,
    recurringCount,
  ] = await Promise.all([
    prisma.lead.count({ where: { companyId, archived: false } }),
    prisma.client.count({ where: { companyId, archived: false } }),
    prisma.user.count({ where: { companyId } }),
    prisma.proposal.count({ where: { client: { companyId } } }),
    prisma.contract.count({ where: { client: { companyId } } }),
    prisma.invoice.count({ where: { client: { companyId } } }),
    prisma.recurringInvoice.count({ where: { client: { companyId } } }),
  ]);
  return (
    <>
      <div className="rounded-2xl border border-brand-primary-600 bg-white shadow-sm mb-6">
        <h2 className="text-xl font-bold uppercase tracking-[0.3em] bg-brand-primary-600 text-[var(--color-brand-contrast)] rounded-t-2xl px-4 py-2 text-center">
          Your Business At a Glance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 pb-2 px-4">
          <div className="flex flex-col items-center justify-center text-center">
            <TotalRevenueSection companyId={companyId} debug={totalRevenueDebug} />
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <UserPlus className="mb-2 h-8 w-8 text-brand-primary-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Leads</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{leadsCount}</p>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <Users className="mb-2 h-8 w-8 text-brand-primary-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Clients</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{clientsCount}</p>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <User className="mb-2 h-8 w-8 text-brand-primary-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Team Members</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{teamCount}</p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-brand-primary-600 bg-white shadow-sm mb-6">
        <h2 className="text-xl font-bold uppercase tracking-[0.3em] bg-brand-primary-600 text-[var(--color-brand-contrast)] rounded-t-2xl px-4 py-2 text-center">
          Documents & Payments
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 pt-6 pb-2 px-4">
          <div className="flex flex-col items-center justify-center text-center">
            <FileText className="mb-2 h-8 w-8 text-brand-primary-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Proposals</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{proposalsCount}</p>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <FileText className="mb-2 h-8 w-8 text-brand-primary-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Contracts</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{contractsCount}</p>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <FileText className="mb-2 h-8 w-8 text-brand-primary-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Invoices</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{invoicesCount}</p>
          </div>
          <div className="flex flex-col items-center justify-center text-center">
            <Repeat className="mb-2 h-8 w-8 text-brand-primary-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Recurring Payments</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">{recurringCount}</p>
          </div>
        </div>
      </div>
    </>
  );
}
