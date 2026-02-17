import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { normalizeList } from '@/lib/messageRecipients';
import { debugLog } from '@/lib/debugLog';

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

const resolveChatId = async (user: { id: string; role?: string | null }, chatId?: string | null) => {
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
      select: { id: true },
    });
    if (!target) {
      return { error: 'Chat not found', status: 404 as const };
    }
  }

  return { chatId: targetId };
};

const resolveCompanyId = async (
  user: { id: string; role?: string | null; companyId?: string | null },
  chatId: string,
) => {
  // For SUPERADMIN, always resolve to the target user's company
  if (user.role === 'SUPERADMIN') {
    const target = await prisma.user.findUnique({
      where: { id: chatId },
      select: { companyId: true },
    });
    return target?.companyId ?? null;
  }
  // For regular users, use their own company
  return user.companyId ?? null;
};

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  debugLog('[CHAT_MSG_GET_START]', { userId: user.id, userRole: user.role });

  const url = new URL(request.url);
  const chatIdParam = url.searchParams.get('chatId') || url.searchParams.get('chat_id');
  const sinceParam = url.searchParams.get('since');
  const since = parseSince(sinceParam);

  const resolved = await resolveChatId(user, chatIdParam);
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const resolvedCompanyId = await resolveCompanyId(user, resolved.chatId);

  debugLog('[CHAT_MSG_GET_RESOLVED]', { chatId: resolved.chatId, companyId: resolvedCompanyId, userRole: user.role });

  const messages = await prisma.message.findMany({
    where: {
      ...(resolvedCompanyId ? { companyId: resolvedCompanyId } : {}),
      contextType: SUPPORT_CONTEXT,
      contextId: resolved.chatId,
      ...(since ? { sentAt: { gt: since } } : {}),
    },
    include: {
      from: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { sentAt: 'asc' },
  });

  debugLog('[CHAT_MSG_GET_FETCHED]', { count: messages.length, chatId: resolved.chatId });

  // Debug: log what we're returning
  debugLog('[CHAT_MSG_GET_RESPONSE]', {
    messageCount: messages.length,
    messages: messages.map((m) => ({
      id: m.id,
      fromId: m.fromId,
      fromRole: m.from?.role,
      fromName: m.from?.name,
      text: m.text?.substring(0, 30),
    })),
  });

  return NextResponse.json({
    messages: messages.map((message) => ({
      id: message.id,
      text: message.text,
      sentAt: message.sentAt.toISOString(),
      fromId: message.fromId,
      fromName: message.from?.name ?? message.from?.email ?? null,
      fromRole: message.senderRole ?? message.from?.role ?? null,
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
    
    debugLog('[CHAT_MSG_POST_START]', { userId: user.id, userRole: user.role, body });

    const content = String(body.content ?? body.text ?? '').trim();
    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const resolved = await resolveChatId(user, body.chatId || body.chat_id || null);
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const resolvedCompanyId = await resolveCompanyId(user, resolved.chatId);
    if (!resolvedCompanyId) {
      return NextResponse.json({ error: 'Missing company for chat' }, { status: 400 });
    }

    // Validate that the Company actually exists to avoid foreign key constraint errors
    const company = await prisma.company.findUnique({
      where: { id: resolvedCompanyId },
      select: { id: true },
    });

    if (!company) {
      console.error('Support chat message failed: Company not found', {
        userId: user.id,
        companyId: resolvedCompanyId,
        chatId: resolved.chatId,
      });
      return NextResponse.json(
        { error: 'Invalid company reference. Please contact support.' },
        { status: 400 },
      );
    }

    const participants = Array.from(new Set(normalizeList([user.id, resolved.chatId])));
    const toUserIds = normalizeList([resolved.chatId]);
    
    // Determine sender role: either from body.role (for BOT) or user.role
    const senderRole = body.role?.toUpperCase() === 'BOT' ? 'BOT' : (user.role || 'USER');

    debugLog('[CHAT_MSG_BEFORE_CREATE]', { resolvedChatId: resolved.chatId, resolvedCompanyId, participants, toUserIds, senderRole });

    const message = await prisma.message.create({
      data: {
        companyId: resolvedCompanyId,
        fromId: user.id,
        text: content,
        fileUrl: null,
        toAll: false,
        contextType: SUPPORT_CONTEXT,
        contextId: resolved.chatId,
        senderRole,
        ...(toUserIds.length ? { toUserIds } : {}),
        ...(participants.length ? { participants } : {}),
      },
      include: {
        from: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    debugLog('[CHAT_MSG_CREATED]', { 
      messageId: message.id, 
      fromId: message.fromId, 
      fromRole: message.from?.role,
      contextId: message.contextId,
      senderRole: user.role,
      senderName: user.name,
    });

    return NextResponse.json({
      message: {
        id: message.id,
        text: message.text,
        sentAt: message.sentAt.toISOString(),
        fromId: message.fromId,
        fromName: message.from?.name ?? message.from?.email ?? null,
        fromRole: message.senderRole ?? message.from?.role ?? null,
        chatId: message.contextId ?? null,
      },
    });
  } catch (error) {
    const err = error as { message?: string; code?: string; meta?: unknown };
    debugLog('[CHAT_MSG_ERROR]', { message: err?.message, code: err?.code, userId: user.id, userRole: user.role });
    const devMode = process.env.NODE_ENV !== 'production';
    const canExpose = devMode || user.role === 'SUPERADMIN';
    const details = canExpose
      ? err?.message || (typeof error === 'string' ? error : String(error))
      : undefined;
    const code = canExpose ? err?.code : undefined;
    const meta = canExpose ? err?.meta : undefined;
    return NextResponse.json(
      {
        error: 'Unable to save message',
        ...(details ? { details } : {}),
        ...(code ? { code } : {}),
        ...(meta ? { meta } : {}),
      },
      { status: 500 },
    );
  }
}
