// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { createSession, verifyPassword, sessionCookieOptions } from '../../../../lib/auth';
import prisma from '@/lib/prisma';

type LoginPayload = {
  email?: string;
  password?: string;
};

type PrismaCandidate = {
  __databaseUnavailable?: boolean;
  user?: {
    findUnique?: unknown;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginPayload;
    const rawEmail = typeof body.email === 'string' ? body.email : '';
    const email = rawEmail.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const prismaCandidate = prisma as PrismaCandidate | null;
    
    if (
      !prismaCandidate ||
      prismaCandidate.__databaseUnavailable ||
      typeof prismaCandidate.user?.findUnique !== 'function'
    ) {
      return new Response(
        JSON.stringify({ error: 'Database unavailable.' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Use real Prisma client
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials.' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials.' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { token } = await createSession(user.id);
    const res = NextResponse.json({ success: true, session_token: token });
    res.cookies.set('session_token', token, sessionCookieOptions());
    return res;
  } catch (error: unknown) {
    console.error('Login failed', error);
    return new Response(
      JSON.stringify({
        error: 'Unable to sign in right now. Please try again.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
