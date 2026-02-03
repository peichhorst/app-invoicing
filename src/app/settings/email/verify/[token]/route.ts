import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createSession, sessionCookieOptions } from '@/lib/auth';
import { sendEmailChangedNotification } from '@/lib/email';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.redirect('/settings/email?error=invalid');
  }

  const tokenRecord = await prisma.emailChangeToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!tokenRecord) {
    return NextResponse.redirect('/settings/email?error=invalid');
  }

  if (tokenRecord.expiresAt.getTime() < Date.now()) {
    await prisma.emailChangeToken.delete({ where: { id: tokenRecord.id } });
    return NextResponse.redirect('/settings/email?error=expired');
  }

  const oldEmail = tokenRecord.user.email;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { email: tokenRecord.newEmail },
    });

    await prisma.emailChangeToken.delete({ where: { id: tokenRecord.id } });

    try {
      await sendEmailChangedNotification(oldEmail, tokenRecord.newEmail);
    } catch (emailError) {
      console.error('Failed to notify old email:', emailError);
    }

    const session = await createSession(updatedUser.id);
    const response = NextResponse.redirect('/dashboard/profile?emailChanged=1');
    response.cookies.set('session_token', session.token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error('Email change verification failed:', error);
    return NextResponse.redirect('/settings/email?error=failed');
  }
}
