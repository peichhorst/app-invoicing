// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, hashPassword, sessionCookieOptions } from '@/lib/auth';
import { TRIAL_LENGTH_MS } from '@/lib/plan';
import { sendRegistrationAlert } from '@/lib/email';
import { Role } from '@prisma/client';

type RegisterPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterPayload;
    const { email, password } = body;

    if (!email || !password) {
      return new Response('Email and password are required.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return new Response('Email already registered.', {
        status: 409,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const hashed = await hashPassword(password);
    const defaultName = email.split('@')[0] || 'Invoice User';
    const trialEndsAt = new Date(Date.now() + TRIAL_LENGTH_MS);

    const user = await prisma.user.create({
      data: {
        name: defaultName,
        email,
        password: hashed,
        planTier: 'PRO_TRIAL',
        role: Role.OWNER,
        proTrialEndsAt: trialEndsAt,
        proTrialReminderSent: false,
      },
    });

    const company = await prisma.company.create({
      data: {
        name: user.companyName?.trim() || `${defaultName}'s Workspace`,
        ownerId: user.id,
        users: { connect: { id: user.id } },
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { companyId: company.id },
    });

    try {
      await sendRegistrationAlert(user.email);
    } catch (error) {
      console.error('Registration alert failed', error);
    }
    const { token } = await createSession(user.id);

    const res = NextResponse.json({ success: true });
    res.cookies.set('session_token', token, sessionCookieOptions());
    return res;
  } catch (error: unknown) {
    console.error('Registration failed', error);
    return new Response('Registration failed. Please try again.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
