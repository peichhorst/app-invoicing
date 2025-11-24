// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, hashPassword, sessionCookieOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, companyName, logoDataUrl, phone, addressLine1, addressLine2, city, state, postalCode, country } = body;

    if (!email || !password || !name) {
      return new Response('Name, email, and password are required.', {
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

    const user = await prisma.user.create(
      {
        data: {
          name,
          email,
          password: hashed,
          companyName: companyName || null,
          logoDataUrl: logoDataUrl || null,
          phone: phone || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          city: city || null,
          state: state || null,
          postalCode: postalCode || null,
          country: country || 'USA',
        },
      } as any
    );

    const { token } = await createSession(user.id);

    const res = NextResponse.json({ success: true });
    res.cookies.set('session_token', token, sessionCookieOptions());
    return res;
  } catch (error: any) {
    console.error('Registration failed', error);
    return new Response('Registration failed. Please try again.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
