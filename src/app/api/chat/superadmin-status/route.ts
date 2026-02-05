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
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const url = new URL(request.url);
  const windowMinutes = clampWindowMinutes(url.searchParams.get('window'));
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  try {
    const superadmins = await prisma.user.findMany({
      where: {
        role: 'SUPERADMIN',
        lastSeenAt: { gt: since },
      },
      select: { id: true, name: true, email: true, lastSeenAt: true },
      orderBy: { lastSeenAt: 'desc' },
      take: 1,
    });

    if (!superadmins.length) {
      return NextResponse.json({ superadminOnline: false, windowMinutes });
    }

    const current = superadmins[0];
    return NextResponse.json({
      superadminOnline: true,
      superadmin: {
        id: current.id,
        name: current.name ?? null,
        email: current.email ?? null,
        lastSeen: current.lastSeenAt ? current.lastSeenAt.toISOString() : null,
      },
      windowMinutes,
    });
  } catch (error) {
    console.error('Superadmin status lookup failed', error);
    return NextResponse.json({ superadminOnline: false, windowMinutes });
  }
}
