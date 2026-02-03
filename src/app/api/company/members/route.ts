import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const companyId = user.companyId ?? user.company?.id ?? null;
  if (!companyId) return NextResponse.json({ error: 'User is not linked to a company' }, { status: 400 });

  const members = await prisma.user.findMany({
    where: { companyId },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ members });
}
