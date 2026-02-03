// src/app/dashboard/proposals/page.tsx
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Plus, FileText } from 'lucide-react';
import { ProposalActions } from './ProposalActions';
import ProposalFilterSelect from './ProposalFilterSelect';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{ filter?: string | string[] }>;
};

type ProposalStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'SIGNED' | 'COMPLETED' | 'DECLINED';

const STATUS_OPTIONS = ['All', 'DRAFT', 'SENT', 'VIEWED', 'SIGNED', 'COMPLETED', 'DECLINED'];

const contractStatuses: ProposalStatus[] = ['SIGNED', 'COMPLETED'];

const formatCurrency = (value: string | number | { toNumber: () => number }, currency = 'USD') => {
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
  const numValue = typeof value === 'object' && 'toNumber' in value ? value.toNumber() : Number(value);
  return formatter.format(numValue);
};

export default async function ProposalsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="px-4 py-10 text-sm text-red-600">Unauthorized</div>;
  }

  const params = await searchParams;
  const requestedFilter = Array.isArray(params?.filter)
    ? params.filter[0]
    : params?.filter;

  const appliedFilter = STATUS_OPTIONS.includes(requestedFilter ?? '')
    ? requestedFilter!
    : 'All';

  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const companyId = user.companyId ?? user.company?.id ?? null;

  const proposals = await prisma.proposal.findMany({
    where: {
      ...(isOwnerOrAdmin
        ? { user: { companyId: companyId ?? undefined } }
        : { userId: user.id }),
      ...(appliedFilter !== 'All' ? { status: appliedFilter as ProposalStatus } : {}),
      type: 'PROPOSAL', // Only show proposals, not contracts
    },
    include: {
      client: true,
      user: true,
      contract: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <main className="w-full">
      <div className="pb-16">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold text-gray-900">
                Proposals
              </h1>
              <p className="text-sm text-gray-500">
                Manage your proposals here.
              </p>
            </div>
            <div className="ml-auto flex flex-col gap-3 sm:flex-row sm:items-center justify-end w-full">
              <div className="flex gap-3 items-center">
                <ProposalFilterSelect current={appliedFilter} />
                <Link
                  href="/dashboard/proposals/new"
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-primary-300 bg-brand-primary-600 px-4 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:border-brand-primary-600 hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)]"
                >
                  <Plus className="h-4 w-4" />
                  New proposal
                </Link>
              </div>
            </div>
          </header>

          {proposals.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-white p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-zinc-400" />
              <h3 className="mt-4 text-lg font-medium text-zinc-900">No proposals yet</h3>
              <p className="mt-2 text-sm text-zinc-500">Create your first proposal to get started.</p>
              <Link
                href="/dashboard/proposals/new"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700"
              >
                <Plus className="h-4 w-4" />
                Add Your First Proposal
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="space-y-4 md:hidden">
                {proposals.map((proposal) => {
                  const isContractType = proposal.type === 'CONTRACT';
                  const isSignedContract = isContractType && contractStatuses.includes(proposal.status);
                  return (
                    <div key={proposal.id} className="rounded-lg border bg-white p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{proposal.title}</p>
                          <p className="text-sm text-gray-600">
                            {proposal.client?.companyName || proposal.client?.contactName || 'No client'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {formatCurrency(proposal.total, proposal.currency)}
                          </p>
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              isSignedContract
                                ? 'bg-emerald-100 text-emerald-700'
                                : isContractType
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-brand-primary-100 text-brand-primary-700'
                            }`}
                          >
                            {isSignedContract
                              ? 'Signed contract'
                              : isContractType
                                ? 'Contract'
                                : proposal.status.charAt(0) + proposal.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <ProposalActions
                          proposalId={proposal.id}
                          status={proposal.status}
                          documentType={proposal.type}
                          hasContract={!!proposal.contract}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="relative max-h-[70vh] overflow-x-auto overflow-y-auto">
                  <table className="w-full min-w-[720px] divide-y divide-gray-200">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr className="divide-x divide-gray-200">
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Proposal / contract
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Client
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                          Status
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                          Last updated
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {proposals.map((proposal) => {
                        const isContractType = proposal.type === 'CONTRACT';
                        const isSignedContract = isContractType && contractStatuses.includes(proposal.status);
                        return (
                          <tr key={proposal.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div>{proposal.title}</div>
                              {isContractType ? (
                                <p className="text-xs text-gray-500">Legally binding contract</p>
                              ) : (
                                <p className="text-xs text-gray-400">Proposal</p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-gray-500">
                              {proposal.client?.companyName || proposal.client?.contactName || 'No client'}
                            </td>
                            <td className="px-6 py-4 text-right font-semibold text-gray-900">
                              {formatCurrency(proposal.total, proposal.currency)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  isSignedContract
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : isContractType
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-brand-primary-100 text-brand-primary-700'
                                }`}
                              >
                                {isSignedContract
                                  ? 'Signed contract'
                                  : isContractType
                                    ? 'Contract'
                                    : proposal.status.charAt(0) + proposal.status.slice(1).toLowerCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center text-xs text-gray-500">
                              {proposal.updatedAt.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <ProposalActions
                                proposalId={proposal.id}
                                status={proposal.status}
                                documentType={proposal.type}
                                hasContract={!!proposal.contract}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
