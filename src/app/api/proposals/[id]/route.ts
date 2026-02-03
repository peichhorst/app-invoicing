import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const companyId = user.companyId ?? user.company?.id ?? null;
  const { id } = await params;

  try {
    const existing = await prisma.proposal.findFirst({
      where: isOwnerOrAdmin
        ? { id, user: { companyId: companyId ?? undefined } }
        : { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    await prisma.proposal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Delete proposal failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete proposal', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
