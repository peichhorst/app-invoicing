import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import DocumentHeader from '@/components/invoicing/shared/DocumentHeader';
import LineItemsTable from '@/components/invoicing/shared/LineItemsTable';
import TotalsSection from '@/components/invoicing/shared/TotalsSection';
import PaymentTermsFooter from '@/components/invoicing/shared/PaymentTermsFooter';

type ViewProposalPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ViewProposalPage({ params }: ViewProposalPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const user = await getCurrentUser();
  if (!user) {
    return <div className="px-4 py-10 text-sm text-red-600">Unauthorized</div>;
  }

  const proposal = await prisma.proposal.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      client: true,
      user: {
        include: {
          company: true,
        },
      },
    },
  });

  if (!proposal) {
    notFound();
  }

  const lineItems = JSON.parse(proposal.lineItems as string) || [];
  const isSigned = proposal.status === 'SIGNED' || proposal.status === 'COMPLETED';
  const isCompleted = proposal.status === 'COMPLETED';

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Back Button */}
        <Link
          href="/dashboard/proposals-contracts"
          className="inline-flex items-center text-sm font-semibold text-purple-600 hover:text-purple-700"
        >
          ← Back to proposals
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="space-y-8">
            {/* Status Badge */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Proposal Status</p>
                <p
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                    isSigned
                      ? 'bg-emerald-100 text-emerald-700'
                      : proposal.status === 'SENT'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {isSigned ? 'Contract' : proposal.status}
                </p>
                {isSigned && (
                  <p className="mt-1 text-xs text-emerald-600">
                    {proposal.signedAt
                      ? `Signed on ${new Date(proposal.signedAt).toLocaleDateString()}`
                      : 'Legally binding contract'}
                  </p>
                )}
              </div>
              {isCompleted && proposal.invoiceId && (
                <Link
                  href={`/dashboard/invoices/${proposal.invoiceId}`}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                >
                  View Invoice
                </Link>
              )}
            </div>

            {/* Document Header Component */}
            <DocumentHeader
              company={{
                name: proposal.user.company?.name || proposal.user.companyName || 'Your Company',
                logo: proposal.user.company?.logoUrl || undefined,
                address: [
                  proposal.user.company?.addressLine1,
                  proposal.user.company?.addressLine2,
                  [proposal.user.company?.city, proposal.user.company?.state, proposal.user.company?.postalCode]
                    .filter(Boolean)
                    .join(', '),
                  proposal.user.company?.country || 'USA',
                ]
                  .filter(Boolean)
                  .join('\n'),
                email: proposal.user.email || undefined,
                phone: proposal.user.phone || undefined,
              }}
              client={{
                name: proposal.client.contactName || '',
                companyName: proposal.client.companyName,
                email: proposal.client.email || undefined,
                address: undefined,
              }}
              documentNumber={proposal.id.slice(0, 8).toUpperCase()}
              documentDate={proposal.createdAt}
              dueDate={proposal.validUntil || undefined}
              documentType="proposal"
            />

            {/* Proposal Title & Description */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{proposal.title}</h2>
                {proposal.description && (
                  <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{proposal.description}</p>
                )}
              </div>

              {/* Scope of Work */}
              {proposal.scope && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-6">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-purple-900">
                    Scope of Work
                  </h3>
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                    {proposal.scope}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {proposal.validUntil && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Timeline</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Proposal Date:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(proposal.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valid Until:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(proposal.validUntil).toLocaleDateString()}
                      </span>
                    </div>
                    {proposal.signedAt && (
                      <div className="flex justify-between border-t border-gray-200 pt-2">
                        <span className="text-gray-600">Signed On:</span>
                        <span className="font-semibold text-emerald-600">
                          {new Date(proposal.signedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Line Items Table Component */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Pricing</h3>
              <LineItemsTable items={lineItems} />
            </div>

            {/* Totals Section Component */}
            <TotalsSection
              subtotal={Number(proposal.total) || 0}
              total={Number(proposal.total) || 0}
              currency={proposal.currency || 'USD'}
            />

            {/* Signature Block */}
            {isSigned && (
              <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50 p-6">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-900">
                  Digital Signature
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Signed By:</span>
                    <span className="font-semibold text-gray-900">
                      {proposal.client.contactName || proposal.client.companyName}
                    </span>
                  </div>
                  {proposal.signedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-700">Date:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(proposal.signedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  <p className="mt-4 border-t border-emerald-200 pt-4 text-xs text-emerald-700">
                    This is a legally binding contract. By signing, the client agrees to the terms and scope outlined
                    above.
                  </p>
                </div>
              </div>
            )}

            {/* Payment Terms Footer Component */}
            <PaymentTermsFooter
              paymentTerms={
                proposal.notes ||
                'Payment terms will be specified in the invoice generated upon completion of this proposal.'
              }
              documentType="proposal"
            />

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-6">
              <Link
                href="/dashboard/proposals-contracts"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                ← Back to proposals
              </Link>
              {!isCompleted && (
                <button className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700">
                  Edit Proposal
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
