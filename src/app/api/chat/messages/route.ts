import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { serializeRecipientList } from '@/lib/messageRecipients';

export const dynamic = 'force-dynamic';

const SUPPORT_CONTEXT = 'SUPPORT_CHAT';

const parseSince = (value: string | null) => {
  if (!value) return null;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) {
    const date = new Date(asNumber);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveChatId = async (user: { id: string; role?: string | null; companyId?: string | null }, chatId?: string | null) => {
  if (!user.companyId) {
    return { error: 'Unauthorized', status: 403 as const };
  }
  const isSuperAdmin = user.role === 'SUPERADMIN';
  if (!isSuperAdmin) {
    if (chatId && chatId !== user.id) {
      return { error: 'Forbidden', status: 403 as const };
    }
    return { chatId: user.id };
  }

  const targetId = chatId && typeof chatId === 'string' ? chatId : user.id;
  if (targetId !== user.id) {
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, companyId: true },
    });
    if (!target || target.companyId !== user.companyId) {
      return { error: 'Chat not found', status: 404 as const };
    }
  }

  return { chatId: targetId };
};

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const url = new URL(request.url);
  const chatIdParam = url.searchParams.get('chatId') || url.searchParams.get('chat_id');
  const sinceParam = url.searchParams.get('since');
  const since = parseSince(sinceParam);

  const resolved = await resolveChatId(user, chatIdParam);
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const messages = await prisma.message.findMany({
    where: {
      companyId: user.companyId,
      contextType: SUPPORT_CONTEXT,
      contextId: resolved.chatId,
      ...(since ? { sentAt: { gt: since } } : {}),
    },
    include: {
      from: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { sentAt: 'asc' },
  });

  return NextResponse.json({
    messages: messages.map((message) => ({
      id: message.id,
      text: message.text,
      sentAt: message.sentAt.toISOString(),
      fromId: message.fromId,
      fromName: message.from?.name ?? message.from?.email ?? null,
      fromRole: message.from?.role ?? null,
      chatId: message.contextId ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      chatId?: string;
      chat_id?: string;
      content?: string;
      text?: string;
      role?: string;
    };

    const content = String(body.content ?? body.text ?? '').trim();
    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const resolved = await resolveChatId(user, body.chatId || body.chat_id || null);
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const participants = Array.from(new Set([user.id, resolved.chatId]));

    const message = await prisma.message.create({
      data: {
        companyId: user.companyId as string,
        fromId: user.id,
        text: content,
        fileUrl: null,
        toAll: false,
        toRoles: serializeRecipientList([]),
        toPositions: serializeRecipientList([]),
        toUserIds: serializeRecipientList([resolved.chatId]),
        participants: serializeRecipientList(participants),
        contextType: SUPPORT_CONTEXT,
        contextId: resolved.chatId,
      },
      include: {
        from: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        text: message.text,
        sentAt: message.sentAt.toISOString(),
        fromId: message.fromId,
        fromName: message.from?.name ?? message.from?.email ?? null,
        fromRole: message.from?.role ?? null,
        chatId: message.contextId ?? null,
      },
    });
  } catch (error) {
    console.error('Support chat message failed', error);
    return NextResponse.json({ error: 'Unable to save message' }, { status: 500 });
  }
}
