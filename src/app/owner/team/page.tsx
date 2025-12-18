import Link from 'next/link';
import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DeleteUserButton } from '@/app/dashboard/admin/users/DeleteUserButton';
import InviteUserForm from '@/app/dashboard/admin/users/InviteUserForm';
import { TeamTableWithAutoRefresh } from './TeamTableWithAutoRefresh';
import { PositionManager } from './PositionManager';

export const dynamic = 'force-dynamic';

export default async function OwnerTeamPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'OWNER') {
    redirect('/dashboard');
  }

  const ownerCompany =
    user.companyId ??
    (await prisma.company.findFirst({
      where: { ownerId: user.id },
      select: { id: true },
    }))?.id ??
    null;

  const ownerCompanyMissing = !ownerCompany;

  const members = ownerCompany
    ? await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          companyId: true,
          role: true,
          isConfirmed: true,
          position: true,
          positionId: true,
          positionCustom: {
            select: {
              name: true,
            },
          },
        },
        where: { companyId: ownerCompany },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500">Manage your company members and roles.</p>
        </div>
        <PositionManager />
        {ownerCompanyMissing ? (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm text-orange-900">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">
              Owner account missing company
            </p>
            <p className="mt-1 text-base font-semibold">Complete your company setup before inviting teammates.</p>
            <p className="mt-2 text-zinc-700">
              Please finish the business details on the settings page before inviting others to the workspace.
            </p>
            <Link
              href="/dashboard/settings"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-purple-600 hover:text-purple-700"
            >
              Update settings
            </Link>
          </div>
        ) : (
          <InviteUserForm />
        )}
        <TeamTableWithAutoRefresh members={members} />
      </div>
    </div>
  );
}
