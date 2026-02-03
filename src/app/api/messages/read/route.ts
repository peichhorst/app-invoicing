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
    const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === 'string' && id.trim()) : [];
    if (!ids.length) return NextResponse.json({ success: true });

    await prisma.$transaction(
      ids.map((id) =>
        prisma.message.update({
          where: { id },
          data: {
            readBy: { connect: { id: user.id } },
          },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark read failed', error);
    return NextResponse.json({ error: 'Unable to mark as read' }, { status: 500 });
  }
}
