import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CheckCircle, XCircle } from 'lucide-react';

type MemberStatus = {
  id: string;
  name: string;
  email: string;
};

type ResourceCompliance = {
  id: string;
  title: string;
  requiresAcknowledgment: boolean;
  acknowledgments: {
    userId: string;
  }[];
};

export const dynamic = 'force-dynamic';

export default async function CompliancePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }

  if (!['OWNER', 'ADMIN', 'SUPERADMIN'].includes(user.role)) {
    redirect('/dashboard');
  }

  const companyId = user.companyId ?? user.company?.id ?? null;
  if (!companyId) {
    return (
      <div className="min-h-screen px-4 py-10">
        <p className="text-sm text-rose-600">Company association required to view compliance.</p>
      </div>
    );
  }

  const [teamMembers, complianceResources] = await Promise.all([
    prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.resource.findMany({
      where: {
        companyId,
        requiresAcknowledgment: true,
      },
      include: {
        acknowledgments: {
          select: { userId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const memberCount = teamMembers.length;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Compliance</p>
          <h1 className="text-3xl font-semibold text-zinc-900">Document acknowledgments</h1>
          <p className="text-sm text-zinc-500">
            Monitor which documents require acknowledgment and who still needs to confirm.
          </p>
        </div>

        {complianceResources.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
            No compliance resources have been configured yet.
          </div>
        ) : (
          <div className="space-y-5">
            {complianceResources.map((resource) => {
              const ackedUserIds = new Set(resource.acknowledgments.map((ack) => ack.userId));
              const remaining = memberCount - ackedUserIds.size;
              return (
                <div key={resource.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-zinc-900">{resource.title}</p>
                      <p className="text-xs uppercase tracking-[0.3em] text-amber-600">Compliance required</p>
                      <p className="text-sm text-zinc-600">
                        {ackedUserIds.size} of {memberCount} team members acknowledged
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-brand-primary-600 bg-brand-primary-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-sm hover:bg-brand-primary-700"
                    >
                      Remind all
                    </button>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {teamMembers.map((member) => {
                      const acknowledged = ackedUserIds.has(member.id);
                      return (
                        <div
                          key={member.id}
                          className={`flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${
                            acknowledged
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                              : 'border-rose-200 bg-rose-50 text-rose-900'
                          }`}
                        >
                          <div>
                            <p className="font-semibold">{member.name ?? member.email}</p>
                            <p className="text-xs text-current/80">{member.email}</p>
                          </div>
                          {acknowledged ? (
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-rose-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
