import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { sendMessageEmail } from '@/lib/email';

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
      toRoles?: Role[];
      toPositions?: string[];
      toUserIds?: string[];
    };

    const text = body.text?.trim();
    if (!text) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    const toRoles = Array.isArray(body.toRoles)
      ? body.toRoles.filter((r): r is Role => Object.values(Role).includes(r))
      : [];
    const toPositions = Array.isArray(body.toPositions)
      ? body.toPositions.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim())
      : [];
    const toUserIds = Array.isArray(body.toUserIds)
      ? body.toUserIds.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim())
      : [];

    const message = await prisma.message.create({
      data: {
        companyId: user.companyId,
        fromId: user.id,
        text,
        fileUrl: body.fileUrl?.trim() || null,
        toAll: Boolean(body.toAll),
        toRoles,
        toPositions,
        toUserIds,
      },
      include: {
        from: { select: { name: true, email: true } },
      },
    });

    // Resolve recipients
    const targetIds = new Set<string>();
    if (body.toAll) {
      const all = await prisma.user.findMany({
        where: { companyId: user.companyId },
        select: { id: true, email: true, name: true },
      });
      all.forEach((u) => targetIds.add(u.id));
    } else {
      if (toRoles.length > 0) {
        const byRoles = await prisma.user.findMany({
          where: { companyId: user.companyId, role: { in: toRoles } },
          select: { id: true },
        });
        byRoles.forEach((u) => targetIds.add(u.id));
      }
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
