import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const message = await prisma.message.findUnique({
      where: { id },
      select: { id: true, companyId: true, fromId: true },
    });

    if (!message || message.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const canDelete = message.fromId === user.id || user.role === 'OWNER' || user.role === 'ADMIN';
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.message.update({
      where: { id },
      data: { readBy: { set: [] } },
    });

    const result = await prisma.message.deleteMany({
      where: { id, companyId: user.companyId },
    });

    if (!result.count) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message failed', error);
    const details =
      process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined;
    return NextResponse.json(
      { error: 'Delete failed', ...(details ? { details } : {}) },
      { status: 500 },
    );
  }
}
