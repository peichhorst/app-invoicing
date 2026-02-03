import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { ContractActions } from './ContractActions';

export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  const contracts = await prisma.contract.findMany({
    where: { userId: user.id },
    include: {
      client: true,
      proposal: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Contracts</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage your service agreements and contract terms
          </p>
        </div>
        <div className="flex justify-end">
          <Link
            href="/dashboard/contracts/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700"
          >
            <Plus className="h-4 w-4" />
            New Contract
          </Link>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-zinc-400" />
          <h3 className="mt-4 text-lg font-medium text-zinc-900">No contracts yet</h3>
          <p className="mt-2 text-sm text-zinc-500">Create your first contract to get started.</p>
          <Link
            href="/dashboard/contracts/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add Your First Contract
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-zinc-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link
                      href={`/dashboard/contracts/${contract.id}`}
                      className="font-medium text-brand-primary-600 hover:text-brand-primary-700"
                    >
                      {contract.title}
                    </Link>
                    {contract.proposal && (
                      <span className="ml-2 text-xs text-zinc-500">
                        (from proposal)
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-900">
                    {contract.client?.companyName || contract.client?.contactName || 'N/A'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        contract.status === 'signed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : contract.status === 'sent'
                            ? 'bg-blue-100 text-blue-800'
                            : contract.status === 'void'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-zinc-100 text-zinc-800'
                      }`}
                    >
                      {contract.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-500">
                    {new Date(contract.createdAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <ContractActions
                      contractId={contract.id}
                      status={contract.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
