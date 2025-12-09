import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { describePlan } from '@/lib/plan';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const plan = describePlan(user);
  const isPro = plan.effectiveTier === 'PRO';
  const count = await prisma.client.count({
    where: { userId: user.id, archived: false },
  });
  const limit = isPro ? null : 3;
  const remaining = limit === null ? null : Math.max(0, limit - count);

  return NextResponse.json({
    canCreate: isPro || (limit !== null && count < limit),
    count,
    limit,
    remaining,
    planTier: plan.planTier,
    effectiveTier: plan.effectiveTier,
    trialEndsAt: plan.trialEndsAt?.toISOString() ?? null,
    graceEndsAt: plan.graceEndsAt?.toISOString() ?? null,
  });
}
