// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';
import { cookies } from 'next/headers';

async function handleLogout(request: Request) {
  const baseUrl = request?.url ? new URL(request.url).origin : 'http://localhost:3000';
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (token) {
      await destroySession(token);
    }
  } catch (error) {
    console.error('Logout error', error);
  }

  const res = NextResponse.redirect(new URL('/', baseUrl));
  res.cookies.set('session_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}

export async function POST(request: Request) {
  return handleLogout(request);
}

export async function GET(request: Request) {
  return handleLogout(request);
}
