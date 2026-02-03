// src/app/api/auth/magic-login/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createSession, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    // Find the magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
    });

    if (!magicLink) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    // Check if expired
    if (magicLink.expiresAt < new Date()) {
      await prisma.magicLink.delete({ where: { token } });
      return NextResponse.redirect(new URL('/login?error=token_expired', request.url));
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: magicLink.email },
    });

    if (!user) {
      await prisma.magicLink.delete({ where: { token } });
      return NextResponse.redirect(new URL('/login?error=user_not_found', request.url));
    }

    // Create session
    const { token: sessionToken, expiresAt } = await createSession(user.id);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Error processing magic link:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
