import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { createSession, sessionCookieOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { token } = (await request.json()) as { token?: string | null };
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        isConfirmed: true,
        inviteToken: null,
        inviteTokenExpires: null,
      },
    });

    const { token: sessionToken } = await createSession(user.id);

    revalidatePath('/dashboard/team');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/admin/users');

    const res = NextResponse.json({
      success: true,
      user: { id: updated.id, name: updated.name, email: updated.email },
    });
    res.cookies.set('session_token', sessionToken, sessionCookieOptions());
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to confirm invite';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
