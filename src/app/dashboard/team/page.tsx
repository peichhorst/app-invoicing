import Link from 'next/link';
import prisma from '@lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import InviteUserForm from '@/app/dashboard/admin/users/InviteUserForm';
import { TeamTableWithAutoRefresh } from './TeamTableWithAutoRefresh';
import { PositionManager } from './PositionManager';

export const dynamic = 'force-dynamic';

export default async function DashboardTeamPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
    redirect('/dashboard');
  }

  let companyId = user.companyId ?? null;
  if (!companyId && user.role === 'OWNER') {
    const ownerCompany = await prisma.company.findFirst({
      where: { ownerId: user.id },
      select: { id: true },
    });
    companyId = ownerCompany?.id ?? null;
  }

  const companyMissing = !companyId;

  const owner =
    companyId === null
      ? null
      : await prisma.user.findFirst({
          where: { companyId, role: 'OWNER' },
          select: {
            id: true,
            name: true,
            email: true,
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
        });

  const members = companyId
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
        where: { companyId, role: { not: 'OWNER' } },
        orderBy: { createdAt: 'asc' },
      })
    : [];
  const teamMembers = owner ? [{ ...owner }, ...members] : members;

  return (
    <main className="w-full">
      <div className="pb-16">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Team</h1>
            <p className="text-sm text-gray-500">Manage your company members and roles.</p>
          </div>
          {(user.role === 'OWNER' || user.role === 'ADMIN') && <PositionManager />}
          {companyMissing ? (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm text-orange-900">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">
                Company not configured
              </p>
              <p className="mt-1 text-base font-semibold">Complete your company setup before inviting teammates.</p>
              <p className="mt-2 text-zinc-700">
                Please finish the business details on the settings page before inviting others to the workspace.
              </p>
              <Link
                href="/dashboard/settings"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600 hover:text-brand-primary-700"
              >
                Update settings
              </Link>
            </div>
          ) : (
            <InviteUserForm />
          )}
          <TeamTableWithAutoRefresh members={teamMembers} />
        </div>
      </div>
    </main>
  );
}
