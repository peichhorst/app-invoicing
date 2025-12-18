// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }

  let ownerPlanTier = user.planTier;

  // For non-owners, resolve the owner's plan (ties plan access to the company owner)
  if (user.role !== 'OWNER' && user.companyId) {
    const owner = await prisma.user.findFirst({
      where: {
        role: 'OWNER',
        company: { id: user.companyId },
      },
      select: { planTier: true },
    });
    if (owner?.planTier) {
      ownerPlanTier = owner.planTier;
    }
  }

  return NextResponse.json({ user, planTier: ownerPlanTier });
}
