import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { sendMessageEmail } from '@/lib/email';
import { normalizeList } from '@/lib/messageRecipients';
import { debugLog } from '@/lib/debugLog';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  debugLog('[MSG_POST_START]', {
    userId: user.id,
    userRole: user.role,
    companyId: user.companyId,
  });

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

    const toPositions = normalizeList(body.toPositions ?? []);
    const toUserIds = normalizeList(body.toUserIds ?? []);

    // Resolve recipients
    const targetIds = new Set<string>([user.id]);
    if (body.toAll) {
      const all = await prisma.user.findMany({
        where: { companyId: user.companyId },
        select: { id: true, email: true, name: true },
      });
      all.forEach((u: { id: string }) => targetIds.add(u.id));
    } else {
      if (toPositions.length > 0) {
        const byPos = await prisma.user.findMany({
          where: { companyId: user.companyId, positionId: { in: toPositions } },
          select: { id: true },
        });
        byPos.forEach((u: { id: string }) => targetIds.add(u.id));
      }
      if (toUserIds.length > 0) {
        toUserIds.forEach((id) => targetIds.add(id));
      }
    }

    const participants = Array.from(targetIds);
    const isInternalNote = body.contextType === 'INTERNAL_NOTE';

    debugLog('[MSG_BEFORE_CREATE]', {
      toAll: body.toAll,
      toPositions,
      toUserIds,
      participants,
      contextType: body.contextType,
      contextId: body.contextId,
    });

    const message = await prisma.message.create({
      data: {
        companyId: user.companyId,
        fromId: user.id,
        text,
        fileUrl: body.fileUrl?.trim() || null,
        toAll: Boolean(body.toAll),
        contextType: body.contextType || null,
        contextId: body.contextId?.trim() || null,
        ...(toPositions.length ? { toPositions } : {}),
        ...(toUserIds.length ? { toUserIds } : {}),
        ...(participants.length ? { participants } : {}),
        ...(isInternalNote && participants.length
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

    debugLog('[MSG_CREATED]', {
      messageId: message.id,
      fromId: message.fromId,
      contextType: message.contextType,
      contextId: message.contextId,
    });

    // Fetch recipient details and send emails
    if (targetIds.size) {
      const recipients = await prisma.user.findMany({
        where: { id: { in: Array.from(targetIds) } },
        select: { email: true, name: true },
      });
      await Promise.all(
        recipients
          .filter((r: { email?: string | null }) => r.email)
          .map((r: { email?: string | null; name?: string | null }) =>
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
    debugLog('[MSG_ERROR]', {
      error: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      userId: user.id,
      userRole: user.role,
    });
    console.error('Create message failed', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as any)?.code || null;
    const errorMeta = (error as any)?.meta || null;
    
    return NextResponse.json(
      {
        error: 'Unable to create message',
        debug: {
          message: errorMessage,
          code: errorCode,
          meta: errorMeta,
        },
      },
      { status: 500 },
    );
  }
}
