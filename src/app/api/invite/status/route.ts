import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const companyId = user.companyId;
  if (!companyId) {
    return NextResponse.json({ confirmedCount: 0 });
  }

  const confirmedCount = await prisma.user.count({
    where: { companyId, isConfirmed: true },
  });

  const lastConfirmed = await prisma.user.findFirst({
    where: { companyId, isConfirmed: true },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, email: true, updatedAt: true },
  });

  return NextResponse.json({
    confirmedCount,
    lastConfirmed: lastConfirmed
      ? {
          id: lastConfirmed.id,
          name: lastConfirmed.name,
          email: lastConfirmed.email,
          timestamp: lastConfirmed.updatedAt.getTime(),
        }
      : null,
  });
}
