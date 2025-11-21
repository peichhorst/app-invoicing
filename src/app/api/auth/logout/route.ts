// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (token) {
    await destroySession(token);
  }
  const res = NextResponse.redirect(new URL('/', request?.url || 'http://localhost:3000'));
  res.cookies.set('session_token', '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
  return res;
}
