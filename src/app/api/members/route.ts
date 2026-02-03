import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const members = await prisma.user.findMany({
    where: { companyId: user.companyId },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
  });

  return NextResponse.json(members);
}
