import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { ids?: string[] };
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id) => typeof id === 'string' && id.trim())
      : [];
    if (!ids.length) return NextResponse.json({ receipts: [] });

    const messages = await prisma.message.findMany({
      where: { id: { in: ids }, companyId: user.companyId },
      select: { id: true, readBy: { select: { id: true } } },
    });

    const receipts = (messages as Array<{ id: string; readBy: Array<{ id: string }> }>).map(
      (message) => ({
        id: message.id,
        readByIds: message.readBy.map((reader) => reader.id),
      })
    );

    return NextResponse.json({ receipts });
  } catch (error) {
    console.error('Read receipts fetch failed', error);
    return NextResponse.json({ error: 'Unable to fetch receipts' }, { status: 500 });
  }
}
