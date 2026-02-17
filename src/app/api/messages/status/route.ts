import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { buildListContainsFilter } from '@/lib/messageRecipients';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
      return NextResponse.json({ messageCount: 0 }, { status: 200 });
    }

    // Get the most recent message with an explicit field list.
    // This avoids selecting newly-added columns that may not exist yet in a drifted DB.
    const lastMessage = await prisma.message.findFirst({
      where: {
        companyId: user.companyId,
        contextType: { not: 'SUPPORT_CHAT' },
        OR: [
          { toAll: true },
          { toRoles: buildListContainsFilter(user.role) },
          ...(user.positionId ? [{ toPositions: buildListContainsFilter(user.positionId) }] : []),
          { toUserIds: buildListContainsFilter(user.id) },
        ],
      },
      select: {
        id: true,
        text: true,
        fromId: true,
        sentAt: true,
        readBy: { select: { id: true } },
        from: { select: { name: true, email: true } },
      },
      orderBy: { sentAt: 'desc' },
    });

    // Count unread messages (not in readBy list)
    const unreadCount = await prisma.message.count({
      where: {
        companyId: user.companyId,
        contextType: { not: 'SUPPORT_CHAT' },
        OR: [
          { toAll: true },
          { toRoles: buildListContainsFilter(user.role) },
          ...(user.positionId ? [{ toPositions: buildListContainsFilter(user.positionId) }] : []),
          { toUserIds: buildListContainsFilter(user.id) },
        ],
        readBy: {
          none: {
            id: user.id,
          },
        },
      },
    });

    return NextResponse.json({
      messageCount: unreadCount,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            text: lastMessage.text,
            fromId: lastMessage.fromId,
            fromName: lastMessage.from.name || lastMessage.from.email,
            sentAt: lastMessage.sentAt.getTime(),
            isRead: lastMessage.readBy.some((r: { id: string }) => r.id === user.id),
          }
        : null,
    });
  } catch (error) {
    console.error('Message status check failed', error);
    return NextResponse.json({ messageCount: 0 }, { status: 200 });
  }
}
