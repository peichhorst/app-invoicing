import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ResourceForm } from './ResourceForm';
import ResourceTableClient, { ResourceWithCompliance } from './ResourceTableClient';

export const dynamic = 'force-dynamic';

export default async function ResourcesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  const companyId = user.companyId ?? null;
  const canManage = user.role === 'OWNER' || user.role === 'ADMIN';
  let resources: ResourceWithCompliance[] = [];
  let teamCount = 0;

  if (companyId) {
    const rawResources = await prisma.resource.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        acknowledgments: { select: { userId: true } },
      },
    });
    resources = rawResources.map((resource) => ({
      id: resource.id,
      title: resource.title,
      url: resource.url,
      createdAt: resource.createdAt?.toISOString() ?? null,
      requiresAcknowledgment: resource.requiresAcknowledgment,
      acknowledgments: resource.acknowledgments,
    }));
    teamCount = await prisma.user.count({ where: { companyId } });
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Resources</p>
          <h1 className="text-3xl font-semibold text-zinc-900">Resources</h1>
          <p className="text-sm text-zinc-600">Links and files shared with your team.</p>
        </div>

        {canManage && <ResourceForm canManage={canManage} />}

        {resources.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
            No resources yet.
          </div>
        ) : (
          <ResourceTableClient resources={resources} currentUserId={user.id} teamCount={teamCount} />
        )}
      </div>
    </div>
  );
}
