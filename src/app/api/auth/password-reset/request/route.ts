import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60; // 1 hour

type PasswordResetRequestPayload = {
  email?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PasswordResetRequestPayload;
    const email = body.email;
    if (!email) {
      return new Response('Email is required.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    await sendPasswordResetEmail(user.email, token);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Password reset request failed', error);
    return new Response('Unable to send password reset link right now.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
