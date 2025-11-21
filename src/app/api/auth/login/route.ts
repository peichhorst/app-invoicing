// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, verifyPassword, sessionCookieOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const { token } = await createSession(user.id);
    const res = NextResponse.json({ success: true });
    res.cookies.set('session_token', token, sessionCookieOptions());
    return res;
  } catch (error: any) {
    console.error('Login failed', error);
    return NextResponse.json({ error: 'Login failed', details: error?.message || String(error) }, { status: 500 });
  }
}
