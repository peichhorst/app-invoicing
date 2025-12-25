import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { NewProposalForm } from './NewProposalForm';

type NewProposalPageProps = {
  searchParams?: Promise<{ type?: string }>;
};

const documentChoices = [
  {
    type: 'PROPOSAL',
    title: 'Create Proposal',
    description: 'Client must sign to accept the proposal.',
    accent: 'from-brand-primary-500 to-brand-primary-400',
  },
  {
    type: 'CONTRACT',
    title: 'Create Contract',
    description: 'Legally binding service agreement backed by your terms.',
    accent: 'from-purple-500 to-purple-400',
  },
];

export default async function NewProposalPage({ searchParams }: NewProposalPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  const params = searchParams ? await searchParams : undefined;
  const requestedType = params?.type?.toUpperCase();
  const isContract = requestedType === 'CONTRACT';
  const selectedType = isContract ? 'CONTRACT' : 'PROPOSAL';

  if (!params?.type) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Get started</p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-900">Proposal or Contract?</h1>
            <p className="text-sm text-zinc-500">
              Pick the right document for your workflow. Proposals are for previewing deliverables, contracts lock in services.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {documentChoices.map((choice) => (
              <Link
                key={choice.type}
                href={`/dashboard/proposals-contracts/new?type=${choice.type}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <span className={`absolute -inset-1 rounded-2xl bg-gradient-to-r ${choice.accent} opacity-0 transition group-hover:opacity-10`} aria-hidden="true" />
                <div className="relative space-y-3">
                  <h2 className="text-lg font-semibold text-zinc-900">{choice.title}</h2>
                  <p className="text-sm text-zinc-500">{choice.description}</p>
                </div>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">
                  Start {choice.type === 'PROPOSAL' ? 'proposal' : 'contract'}
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <NewProposalForm documentType={selectedType as 'PROPOSAL' | 'CONTRACT'} />
      </div>
    </div>
  );
}
