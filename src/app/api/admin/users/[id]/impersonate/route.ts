import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { createSession, sessionCookieOptions, getCurrentUser } from '@/lib/auth';

const SESSION_COOKIE = 'session_token';
const BACKUP_COOKIE = 'session_token_backup';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentUser();
  if (!admin || !['ADMIN', 'OWNER', 'SUPERADMIN'].includes(admin.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id: paramId } = await context.params;
  const pathId = paramId || request.nextUrl.pathname.split('/').filter(Boolean).at(-2); // .../users/:id/impersonate
  const targetId = pathId;
  if (!targetId) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE)?.value;

  const { token } = await createSession(target.id);
  const res = NextResponse.json({ success: true });
  if (currentToken) {
    res.cookies.set(BACKUP_COOKIE, currentToken, {
      ...sessionCookieOptions(),
      httpOnly: false, // allow client to detect and show switch-back UI
      secure: process.env.NODE_ENV !== 'development',
    });
  }
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
