import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  const { id } = await params;

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      client: true,
      proposal: true,
      user: true,
    },
  });

  if (!contract) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          Contract not found
        </div>
      </div>
    );
  }

  if (contract.userId !== user.id) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          Unauthorized
        </div>
      </div>
    );
  }

  const paymentMilestones = contract.paymentMilestones as any[];
  const timeline = contract.timeline as any;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/contracts"
            className="rounded-lg border border-zinc-200 p-2 text-zinc-600 transition hover:border-brand-primary-300 hover:text-brand-primary-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{contract.title}</h1>
            <p className="text-sm text-zinc-500">
              Status: <span className="font-medium capitalize">{contract.status}</span>
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/contracts/${id}/edit`}
          className="rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700"
        >
          Edit Contract
        </Link>
      </div>

      {/* Proposal Link */}
      {contract.proposal && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <FileText className="h-4 w-4" />
            <span>
              Converted from{' '}
              <Link
                href={`/dashboard/proposals/${contract.proposalId}`}
                className="font-medium underline"
              >
                Proposal: {contract.proposal.title}
              </Link>
            </span>
          </div>
        </div>
      )}

      {/* Client Info */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Client Information</h2>
        {contract.client ? (
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Company:</span> {contract.client.companyName || 'N/A'}
            </p>
            <p>
              <span className="font-medium">Contact:</span> {contract.client.contactName || 'N/A'}
            </p>
            <p>
              <span className="font-medium">Email:</span> {contract.client.email || 'N/A'}
            </p>
            <p>
              <span className="font-medium">Phone:</span> {contract.client.phone || 'N/A'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No client assigned</p>
        )}
      </div>

      {/* Terms */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Terms & Conditions</h2>
        <div className="whitespace-pre-wrap text-sm text-zinc-700">{contract.terms}</div>
      </div>

      {/* Timeline */}
      {timeline && (timeline.startDate || timeline.endDate) && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Project Timeline</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {timeline.startDate && (
              <div>
                <span className="font-medium">Start Date:</span>{' '}
                {new Date(timeline.startDate).toLocaleDateString()}
              </div>
            )}
            {timeline.endDate && (
              <div>
                <span className="font-medium">End Date:</span>{' '}
                {new Date(timeline.endDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Milestones */}
      {paymentMilestones && paymentMilestones.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Payment Milestones</h2>
          <div className="space-y-3">
            {paymentMilestones.map((milestone: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 p-3"
              >
                <div>
                  <p className="font-medium text-zinc-900">{milestone.description}</p>
                  {milestone.dueDate && (
                    <p className="text-sm text-zinc-500">
                      Due: {new Date(milestone.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <p className="text-lg font-semibold text-zinc-900">
                  ${milestone.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revisions */}
      {(contract.revisionsIncluded !== null || contract.additionalRevisionRate !== null) && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Revisions</h2>
          <div className="space-y-2 text-sm">
            {contract.revisionsIncluded !== null && (
              <p>
                <span className="font-medium">Revisions Included:</span> {contract.revisionsIncluded}
              </p>
            )}
            {contract.additionalRevisionRate !== null && (
              <p>
                <span className="font-medium">Additional Revision Rate:</span> $
                {Number(contract.additionalRevisionRate).toFixed(2)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Legal Terms */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Legal Terms</h2>
        <div className="space-y-3 text-sm">
          {contract.ipOwnership && (
            <div>
              <span className="font-medium">IP Ownership:</span>{' '}
              <span className="capitalize">{contract.ipOwnership}</span>
            </div>
          )}
          {contract.cancellationTerms && (
            <div>
              <span className="font-medium">Cancellation Terms:</span>
              <p className="mt-1 whitespace-pre-wrap text-zinc-700">{contract.cancellationTerms}</p>
            </div>
          )}
          {contract.liabilityCap !== null && (
            <div>
              <span className="font-medium">Liability Cap:</span> $
              {Number(contract.liabilityCap).toFixed(2)}
            </div>
          )}
          {contract.governingLaw && (
            <div>
              <span className="font-medium">Governing Law:</span> {contract.governingLaw}
            </div>
          )}
          {contract.disputeResolution && (
            <div>
              <span className="font-medium">Dispute Resolution:</span>
              <p className="mt-1 whitespace-pre-wrap text-zinc-700">{contract.disputeResolution}</p>
            </div>
          )}
        </div>
      </div>

      {/* Signature */}
      {contract.signedAt && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-emerald-900">Contract Signed</h2>
          <p className="text-sm text-emerald-700">
            Signed on {new Date(contract.signedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
