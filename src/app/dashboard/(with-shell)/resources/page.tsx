import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ResourceForm } from './ResourceForm';
import ResourceTableClient, { ResourceWithCompliance } from './ResourceTableClient';

export const dynamic = 'force-dynamic';

export default async function ResourcesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  const companyId = user.companyId ?? null;
  const canManage = user.role === 'OWNER' || user.role === 'ADMIN';
  let resources: ResourceWithCompliance[] = [];
  let companyUsers: { id: string; positionId: string | null }[] = [];

  if (companyId) {
    const [rawResources, users] = await Promise.all([
      prisma.resource.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        include: {
          acknowledgments: { select: { userId: true } },
        },
      }),
      prisma.user.findMany({
        where: { companyId },
        select: { id: true, positionId: true },
      }),
    ]);
    resources = rawResources.map((resource) => ({
      id: resource.id,
      title: resource.title,
      url: resource.url,
      createdAt: resource.createdAt?.toISOString() ?? null,
      requiresAcknowledgment: resource.requiresAcknowledgment,
      acknowledgments: resource.acknowledgments,
      visibleToPositions: resource.visibleToPositions ?? [],
      description: resource.description,
    }));
    companyUsers = users;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Resources</p>
        <h1 className="text-3xl font-bold text-zinc-900">Resources</h1>
        <p className="text-sm text-zinc-600">Links and files shared with your team.</p>
      </div>

      {canManage && <ResourceForm canManage={canManage} />}

      {resources.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          No resources yet.
        </div>
      ) : (
        <ResourceTableClient
          resources={resources}
          currentUserId={user.id}
          companyUsers={companyUsers}
        />
      )}
    </div>
  );
}
