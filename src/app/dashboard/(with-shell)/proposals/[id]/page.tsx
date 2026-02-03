// src/app/dashboard/proposals/[id]/page.tsx
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import DocumentHeader from '@/components/invoicing/shared/DocumentHeader';
import LineItemsTable from '@/components/invoicing/shared/LineItemsTable';
import TotalsSection from '@/components/invoicing/shared/TotalsSection';
import PaymentTermsFooter from '@/components/invoicing/shared/PaymentTermsFooter';
import SignatureBlock from '@/components/invoicing/SignatureBlock';
import ProposalDetailsSection from '@/components/invoicing/ProposalDetailsSection';
import { NewMessageForm } from '../../messaging/NewMessageForm';

type ViewProposalPageProps = {
  params: Promise<{ id: string }>;
};

type ThreadMessage = {
  id: string;
  text: string;
  sentAt: Date;
  fromId: string;
  from: { name?: string | null; email?: string | null } | null;
  readBy: { id: string }[];
  participants?: string[];
};

const formatThreadDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const getMessagePreview = (text: string) => {
  const firstLine = text.split('\n').find((line) => line.trim()) || '';
  return firstLine.length > 100 ? `${firstLine.slice(0, 100)}...` : firstLine;
};

const getInitials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

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

  // Fetch messages (optional, can be omitted if not needed)
  // ...existing code for messages...

  const lineItems = JSON.parse(proposal.lineItems as string) || [];
  const isSigned = proposal.status === 'SIGNED' || proposal.status === 'COMPLETED';
  const isCompleted = proposal.status === 'COMPLETED';
  const isContract = proposal.type === 'CONTRACT';
  const displayStatus =
    isSigned && isContract
      ? 'Signed contract'
      : isSigned
        ? 'Signed proposal'
        : proposal.status;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Back Button */}
        <Link
          href="/dashboard/proposals"
          className="inline-flex items-center text-sm font-semibold text-brand-primary-600 hover:text-brand-primary-700"
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
                      ? 'bg-brand-accent-100 text-brand-accent-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {displayStatus}
                </p>
                {isContract && isSigned && (
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
                  className="rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-700"
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
                companyName: proposal.client.companyName || undefined,
                email: proposal.client.email || undefined,
                address: undefined,
              }}
              documentNumber={proposal.id.slice(0, 8).toUpperCase()}
              documentDate={proposal.createdAt}
              dueDate={proposal.validUntil || undefined}
              documentType={isContract ? 'contract' : 'proposal'}
            />

            <ProposalDetailsSection
              title={proposal.title}
              description={proposal.description}
              scope={proposal.scope}
              createdAt={proposal.createdAt}
              validUntil={proposal.validUntil}
              signedAt={proposal.signedAt}
              showTimeline
            />

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

            {/* Payment Terms Footer Component */}
            <PaymentTermsFooter
              paymentTerms={
                proposal.notes ||
                'Payment terms will be specified in the invoice generated upon completion of this proposal.'
              }
              documentType={isContract ? 'contract' : 'proposal'}
              showThankYou={false}
            />

            {/* Signature Block */}
            {isSigned && (
              <SignatureBlock
                signedBy={proposal.client.contactName || proposal.client.companyName}
                signedAt={proposal.signedAt}
                signatureUrl={proposal.signatureUrl}
              />
            )}
            <p className="text-center text-sm font-medium text-gray-500">
              Thank you for your business!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
