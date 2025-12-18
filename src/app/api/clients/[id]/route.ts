import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only owners or admins can delete clients' }, { status: 403 });
  }
  try {
    const { id } = await context.params;
    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Delete client failed', err);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const isLead = typeof body.isLead === 'boolean' ? body.isLead : undefined;
  if (isLead === undefined) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  // allow owner/admin; allow assigned rep to convert their own lead
  const canConvert = user.role === 'OWNER' || user.role === 'ADMIN';
  if (!canConvert) {
    return NextResponse.json({ error: 'Only owners or admins can update lead status' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const updated = await prisma.client.update({
      where: { id },
      data: { isLead },
      select: { id: true, isLead: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update client failed', err);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}
