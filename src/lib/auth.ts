// src/lib/auth.ts
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import crypto from 'crypto';
import type { Company, Position, User } from '@prisma/client';
import { ensureTrialState } from './plan';

export const SESSION_COOKIE = 'session_token';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  // Cast to any so builds don’t fail if the generated client lags behind schema
  await (prisma as any).session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

export async function destroySession(token?: string) {
  const cookieStore = await cookies();
  const existingToken = token || cookieStore.get(SESSION_COOKIE)?.value;
  if (existingToken) {
    await (prisma as any).session.deleteMany({ where: { token: existingToken } });
  }
}

export async function getCurrentUser(): Promise<(User & { company?: Company | null; positionCustom?: Position | null }) | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await (prisma as any).session.findUnique({
    where: { token },
    include: { user: { include: { company: true, positionCustom: true } } },
  });

  if (!session) return null;

  if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
    await (prisma as any).session.delete({ where: { token } });
    return null;
  }

  const updated = await ensureTrialState(session.user);
  return updated;
}
