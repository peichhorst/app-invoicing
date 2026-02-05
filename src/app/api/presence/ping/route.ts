import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const updateLastSeen = async (userId: string) => {
  const now = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: { lastSeenAt: now },
    select: { id: true },
  });
  return now;
};

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const lastSeenAt = await updateLastSeen(user.id);
    return NextResponse.json({ ok: true, lastSeenAt: lastSeenAt.toISOString() });
  } catch (error) {
    console.error('Presence ping failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
