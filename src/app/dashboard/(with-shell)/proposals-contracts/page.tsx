import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
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

export default async function ProposalsContractsPage({ searchParams }: PageProps) {
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
    },
    include: {
      client: true,
      user: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-gray-900">
              {appliedFilter === 'SIGNED' ? 'Signed contracts' : 'Proposals & contracts'}
            </h1>
            <p className="text-sm text-gray-500">
              Everything you send is tracked here — live statuses, contracts with e-signatures, and the context your
              team needs.
            </p>
          </div>
          <div className="ml-auto flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="text-sm font-medium text-gray-500">Status filter</label>
            <ProposalFilterSelect current={appliedFilter} />
          </div>
        </header>

        {proposals.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="mb-4 text-gray-500">No proposals yet.</p>
            <Link
              href="/dashboard/proposals-contracts/new"
              className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 cursor-pointer"
            >
              Create your first proposal
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto w-full max-w-full rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr className="divide-x divide-gray-200">
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Proposal / contract
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Client
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Amount
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Last updated
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {proposals.map((proposal) => {
                  const isContract = contractStatuses.includes(proposal.status);
                  return (
                    <tr key={proposal.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-sm font-semibold text-gray-900">
                        <div>{proposal.title}</div>
                        {isContract ? (
                          <p className="text-xs text-gray-500">Legally binding contract</p>
                        ) : (
                          <p className="text-xs text-gray-400">Proposal</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500">
                        {proposal.client?.companyName || proposal.client?.contactName || 'No client'}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(proposal.total, proposal.currency)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            isContract ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {isContract ? 'Contract' : proposal.status.charAt(0) + proposal.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-gray-500">
                        {proposal.updatedAt.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-3 py-3">
                        <ProposalActions proposalId={proposal.id} status={proposal.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="flex justify-end">
          <Link
            href="/dashboard/proposals-contracts/new"
            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 cursor-pointer"
          >
            + New proposal
          </Link>
        </div>
      </div>
    </div>
  );
}
