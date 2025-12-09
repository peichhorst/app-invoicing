// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, verifyPassword, sessionCookieOptions } from '@/lib/auth';

type LoginPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginPayload;
    const { email, password } = body;

    if (!email || !password) {
      return new Response('Email and password are required.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return new Response('Invalid credentials.', {
        status: 401,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return new Response('Invalid credentials.', {
        status: 401,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const { token } = await createSession(user.id);
    const res = NextResponse.json({ success: true });
    res.cookies.set('session_token', token, sessionCookieOptions());
    return res;
  } catch (error: unknown) {
    console.error('Login failed', error);
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Login failed (temp debug): ${detail}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
