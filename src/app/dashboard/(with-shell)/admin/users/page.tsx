import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import InviteUserForm from './InviteUserForm';
import { AdminUsersTable } from './AdminUsersTable';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/dashboard');
  if (user.role === 'OWNER') redirect('/owner/team');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      companyId: true,
      role: true,
      isConfirmed: true,
      company: { select: { name: true } },
    },
    orderBy: [{ company: { name: 'asc' } }, { name: 'asc' }, { email: 'asc' }],
  });

  const sorted = [...users].sort((a, b) => {
    const companyA = (a.company?.name || '').toLowerCase();
    const companyB = (b.company?.name || '').toLowerCase();
    if (companyA !== companyB) return companyA.localeCompare(companyB);
    const roleRank = (role: string) => (role === 'OWNER' ? 0 : 1);
    const roleDiff = roleRank(a.role) - roleRank(b.role);
    if (roleDiff !== 0) return roleDiff;
    const nameA = (a.name || a.email || '').toLowerCase();
    const nameB = (b.name || b.email || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Manage members</h1>
          <p className="text-sm text-gray-500">View company members and their roles.</p>
        </div>
        <InviteUserForm />
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <AdminUsersTable members={sorted} />
        </div>
      </div>
    </div>
  );
}
