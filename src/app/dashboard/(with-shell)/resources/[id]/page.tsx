import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ResourceDetailPage({
  params,
}: {
  params?: Promise<{ id?: string }>;
}) {
  const resolvedParams = (await params) ?? undefined;
  const user = await getCurrentUser();
  if (!user || !user.companyId) {
    notFound();
  }
  const resourceId = resolvedParams?.id;
  if (!resourceId) {
    notFound();
  }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: {
      acknowledgments: {
        select: {
          id: true,
          acknowledgedAt: true,
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { acknowledgedAt: 'desc' },
      },
    },
  });

  if (!resource || resource.companyId !== user.companyId) {
    notFound();
  }

  const ackCount = resource.acknowledgments.length;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">
            Compliance
          </p>
          <h1 className="text-3xl font-semibold text-zinc-900">{resource.title}</h1>
          <p className="text-sm text-zinc-600">Resource details and acknowledgment history.</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Link</p>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-brand-primary-600 hover:underline"
                >
                  {resource.url}
                </a>
              </div>
              <div className="text-right text-sm text-zinc-500">
                <p className="font-semibold text-zinc-900">{ackCount} acknowledgments</p>
                <p className="tracking-tight">{resource.requiresAcknowledgment ? 'Compliance required' : 'Optional'}</p>
              </div>
            </div>
            {resource.description && <p className="text-sm text-zinc-600">{resource.description}</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">Acknowledgments</h2>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{ackCount || 0} total</p>
          </div>
          {ackCount === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No one has acknowledged this document yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {resource.acknowledgments.map((ack) => (
                <div key={ack.id} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/70 px-4 py-3">
                  <div>
                    <p className="font-semibold text-zinc-900">
                      {ack.user?.name ?? 'Unknown user'} ({ack.user?.email ?? ack.userId})
                    </p>
                    <p className="text-xs text-zinc-500">{new Date(ack.acknowledgedAt ?? '').toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
