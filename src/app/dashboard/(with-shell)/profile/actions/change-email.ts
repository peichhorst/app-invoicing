'use server';

import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendEmailChangeVerificationEmail } from '@/lib/email';
import crypto from 'crypto';

export type ChangeEmailResult = {
  status: 'sent' | 'error';
  message: string;
};

export async function changeEmailAction(newEmail: string): Promise<ChangeEmailResult> {
  if (!newEmail) {
    return { status: 'error', message: 'Enter a valid email address.' };
  }
  const normalized = newEmail.trim().toLowerCase();
  if (!normalized.includes('@')) {
    return { status: 'error', message: 'Enter a valid email address.' };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { status: 'error', message: 'You must be signed in.' };
  }
  if (normalized === user.email) {
    return { status: 'error', message: 'Same as current email.' };
  }

  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing && existing.id !== user.id) {
    return { status: 'error', message: 'Email already taken.' };
  }

  await prisma.emailChangeToken.deleteMany({ where: { userId: user.id } });
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.emailChangeToken.create({
    data: {
      userId: user.id,
      newEmail: normalized,
      token,
      expiresAt,
    },
  });

  await sendEmailChangeVerificationEmail(
    normalized,
    token,
    user.company?.primaryColor ?? null
  );
  return { status: 'sent', message: 'Check your new inbox for a verification link.' };
}
