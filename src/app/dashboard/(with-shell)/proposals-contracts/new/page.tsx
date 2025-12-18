import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { NewProposalForm } from './NewProposalForm';

export default async function NewProposalPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <NewProposalForm />
      </div>
    </div>
  );
}
