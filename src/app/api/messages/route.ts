import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { sendMessageEmail } from '@/lib/email';
import { serializeRecipientList } from '@/lib/messageRecipients';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      text?: string;
      fileUrl?: string | null;
      toAll?: boolean;
      toPositions?: string[];
      toUserIds?: string[];
      contextType?: 'CLIENT' | 'INVOICE' | 'PROPOSAL' | 'GENERAL' | 'INTERNAL_NOTE';
      contextId?: string;
    };

    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    const toPositions = Array.isArray(body.toPositions)
      ? body.toPositions.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim())
      : [];
    const toUserIds = Array.isArray(body.toUserIds)
      ? body.toUserIds.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim())
      : [];

    // Resolve recipients
    const targetIds = new Set<string>([user.id]);
    if (body.toAll) {
      const all = await prisma.user.findMany({
        where: { companyId: user.companyId },
        select: { id: true, email: true, name: true },
      });
      all.forEach((u) => targetIds.add(u.id));
    } else {
      if (toPositions.length > 0) {
        const byPos = await prisma.user.findMany({
          where: { companyId: user.companyId, positionId: { in: toPositions } },
          select: { id: true },
        });
        byPos.forEach((u) => targetIds.add(u.id));
      }
      if (toUserIds.length > 0) {
        toUserIds.forEach((id) => targetIds.add(id));
      }
    }

    const participants = Array.from(targetIds);
    const isInternalNote = body.contextType === 'INTERNAL_NOTE';

    const message = await prisma.message.create({
      data: {
        companyId: user.companyId,
        fromId: user.id,
        text,
        fileUrl: body.fileUrl?.trim() || null,
        toAll: Boolean(body.toAll),
        toRoles: serializeRecipientList([]),
        toPositions: serializeRecipientList(toPositions),
        toUserIds: serializeRecipientList(toUserIds),
        participants: serializeRecipientList(participants),
        contextType: body.contextType || null,
        contextId: body.contextId?.trim() || null,
        ...(isInternalNote
          ? {
              readBy: {
                connect: participants.map((id) => ({ id })),
              },
            }
          : undefined),
      },
      include: {
        from: { select: { name: true, email: true } },
      },
    });

    // Fetch recipient details and send emails
    if (targetIds.size) {
      const recipients = await prisma.user.findMany({
        where: { id: { in: Array.from(targetIds) } },
        select: { email: true, name: true },
      });
      await Promise.all(
        recipients
          .filter((r) => r.email)
          .map((r) =>
            sendMessageEmail({
              to: r.email as string,
              fromName: user.name || user.email,
              fromEmail: user.email || undefined,
              companyName: user.company?.name || undefined,
              text,
              fileUrl: body.fileUrl?.trim() || undefined,
            }),
          ),
      );
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Create message failed', error);
    return NextResponse.json({ error: 'Unable to create message' }, { status: 500 });
  }
}
