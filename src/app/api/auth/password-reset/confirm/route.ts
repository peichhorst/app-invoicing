import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

type PasswordResetConfirmPayload = {
  token?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PasswordResetConfirmPayload;
    const { token, password } = body;
    if (!token || !password) {
      return new Response('Token and new password are required.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt.getTime() < Date.now()) {
      return new Response('Invalid or expired token.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const hashed = await hashPassword(password);
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashed },
    });

    await prisma.passwordResetToken.update({
      where: { token },
      data: { used: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Password reset confirmation failed', error);
    return new Response('Unable to reset password right now.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
