import prisma from '@lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EditUserForm from './EditUserForm';

type PageProps = {
  params?: Promise<{ id: string }>;
};

export default async function EditTeamMemberPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
    redirect('/dashboard');
  }

  const resolvedParams = params ? await params : { id: '' };
  const memberId = resolvedParams.id;

  if (!memberId) {
    redirect('/dashboard/team');
  }

  let companyId = user.companyId ?? null;
  if (!companyId && user.role === 'OWNER') {
    const ownerCompany = await prisma.company.findFirst({
      where: { ownerId: user.id },
      select: { id: true },
    });
    companyId = ownerCompany?.id ?? null;
  }

  if (!companyId) {
    redirect('/dashboard/team');
  }

  const member = await prisma.user.findFirst({
    where: {
      id: memberId,
      companyId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      position: true,
      isConfirmed: true,
      phone: true,
      logoDataUrl: true,
      reportsToId: true,
      positionId: true,
      positionCustom: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!member) {
    redirect('/dashboard/team');
  }

  const managerOptions = await prisma.user.findMany({
    where: { companyId, NOT: { id: memberId } },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  });

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Edit Team Member</h1>
          <p className="text-sm text-zinc-500">
            Update the details for {member.name ?? member.email}.
          </p>
        </div>
        <EditUserForm member={member} managerOptions={managerOptions} />
      </div>
    </div>
  );
}
