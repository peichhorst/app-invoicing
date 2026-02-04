import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const clampWindowMinutes = (value: string | null) => {
  if (!value) return 5;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 5;
  return Math.min(60, Math.max(1, Math.floor(parsed)));
};

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  if (user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const windowMinutes = clampWindowMinutes(url.searchParams.get('window'));
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  try {
    const users = await prisma.user.findMany({
      where: {
        companyId: user.companyId,
        role: { not: 'SUPERADMIN' },
        lastSeenAt: { gt: since },
      },
      select: { id: true, name: true, email: true, role: true, lastSeenAt: true },
      orderBy: { lastSeenAt: 'desc' },
    });

    const payload = users.map((entry) => ({
      id: entry.id,
      name: entry.name ?? null,
      email: entry.email ?? null,
      role: entry.role ?? null,
      lastSeen: entry.lastSeenAt ? entry.lastSeenAt.toISOString() : null,
    }));

    return NextResponse.json({ users: payload, windowMinutes });
  } catch (error) {
    console.error('Online users lookup failed', error);
    return NextResponse.json({ users: [], windowMinutes });
  }
}
