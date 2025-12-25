import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import DocumentHeader from '@/components/invoicing/shared/DocumentHeader';
import LineItemsTable from '@/components/invoicing/shared/LineItemsTable';
import TotalsSection from '@/components/invoicing/shared/TotalsSection';
import PaymentTermsFooter from '@/components/invoicing/shared/PaymentTermsFooter';
import SignatureBlock from '@/components/invoicing/SignatureBlock';
import ProposalDetailsSection from '@/components/invoicing/ProposalDetailsSection';
import { NewMessageForm } from '../../messages/NewMessageForm';

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

  const proposalMessages = (await prisma.message.findMany({
    where: {
      companyId: user.companyId ?? undefined,
      contextType: 'PROPOSAL',
      contextId: proposal.id,
    },
    orderBy: { sentAt: 'desc' },
    select: {
      id: true,
      text: true,
      sentAt: true,
      fromId: true,
      from: { select: { name: true, email: true } },
      readBy: { select: { id: true } },
      participants: true,
    },
  })) as ThreadMessage[];

  const fallbackMessages = proposalMessages.length
    ? []
    : ((await prisma.message.findMany({
        where: {
          companyId: user.companyId ?? undefined,
          OR: [{ contextType: null }, { contextType: 'GENERAL' }],
        },
        orderBy: { sentAt: 'desc' },
        take: 12,
        select: {
          id: true,
          text: true,
          sentAt: true,
          fromId: true,
          from: { select: { name: true, email: true } },
          readBy: { select: { id: true } },
          participants: true,
        },
      })) as ThreadMessage[]);

  const threadMessages = proposalMessages.length ? proposalMessages : fallbackMessages;
  const showingFallbackMessages = !proposalMessages.length && fallbackMessages.length > 0;
  const replyAuthorId = threadMessages[0]?.fromId ?? null;
  const replyParticipantIds = Array.from(
    new Set(
      threadMessages.flatMap((msg) =>
        msg.participants && msg.participants.length ? msg.participants : [msg.fromId],
      ),
    ),
  );

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
          href="/dashboard/proposals-contracts"
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

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Messages</h2>
              <div className="mt-4 space-y-4">
                {showingFallbackMessages && (
                  <p className="text-xs text-amber-600">
                    No proposal-specific messages yet. Showing general team messages.
                  </p>
                )}
                {!threadMessages.length ? (
                  <p className="text-sm text-gray-500">No messages yet — start the thread below.</p>
                ) : (
                  <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
                    {threadMessages.map((msg) => {
                      const fromLabel = msg.from?.name || msg.from?.email || 'Someone';
                      const initials = getInitials(fromLabel || 'M');
                      const preview = getMessagePreview(msg.text);
                      const isRead = msg.readBy?.some((r) => r.id === user.id) || msg.fromId === user.id;

                      return (
                        <Link
                          key={msg.id}
                          href={`/dashboard/messages?thread=${msg.id}`}
                          className="flex items-center gap-4 px-4 py-3 transition hover:bg-gray-50"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700">
                            {initials}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">{fromLabel}</p>
                              {!isRead && (
                                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                                  Unread
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{preview}</p>
                          </div>
                          <div className="text-xs font-semibold text-gray-400">
                            {formatThreadDate(msg.sentAt)}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    Message about this proposal
                  </p>
                  <NewMessageForm
                    currentUserId={user.id}
                    contextType="PROPOSAL"
                    contextId={proposal.id}
                    placeholder="Message about this proposal..."
                    replyAuthorId={replyAuthorId}
                    replyParticipantIds={replyParticipantIds}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-start gap-3 border-t border-gray-200 pt-6">
              <Link
                href="/dashboard/proposals-contracts"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                ← Back to proposals
              </Link>
              {!isCompleted && (
                <div className="space-y-1">
                  <button className="rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-700">
                    Edit {isContract ? 'contract' : 'proposal'}
                  </button>
                  {proposal.status !== 'DRAFT' && (
                    <p className="text-xs text-rose-600">
                      Type changes are locked once the document is sent.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
