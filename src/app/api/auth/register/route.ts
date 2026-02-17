// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { createSession, hashPassword, sessionCookieOptions } from '@/lib/auth';
import { TRIAL_LENGTH_MS } from '@/lib/plan';
import { sendRegistrationAlert } from '@/lib/email';
import prisma from '@/lib/prisma';

type RegisterPayload = {
  email?: string;
  password?: string;
};

type PrismaCandidate = {
  __databaseUnavailable?: boolean;
  __databaseUnavailableReason?: string;
  user?: {
    findUnique?: unknown;
    create?: unknown;
  };
  company?: {
    create?: unknown;
  };
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

    const prismaCandidate = prisma as PrismaCandidate | null;
    
    // Check if the Prisma client actually has the methods we need before attempting database operations
    if (
      !prismaCandidate ||
      prismaCandidate.__databaseUnavailable ||
      typeof prismaCandidate.user?.findUnique !== 'function' ||
      typeof prismaCandidate.user?.create !== 'function' ||
      typeof prismaCandidate.company?.create !== 'function'
    ) {
      // Log detailed error information for debugging
      console.error('Prisma client initialization failed:', {
        prismaExists: !!prismaCandidate,
        databaseUnavailable: !!prismaCandidate?.__databaseUnavailable,
        databaseUnavailableReason: prismaCandidate?.__databaseUnavailableReason ?? null,
        userMethodsExist: !!prismaCandidate?.user,
        findUniqueMethodExists: typeof prismaCandidate?.user?.findUnique === 'function',
        createMethodExists: typeof prismaCandidate?.user?.create === 'function',
        companyCreateMethodExists: typeof prismaCandidate?.company?.create === 'function',
        databaseUrlSet: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
        error: 'Prisma client methods not available'
      });
      
      return new Response(
        `Database unavailable. Details:\n` +
        `- Prisma client exists: ${!!prismaCandidate}\n` +
        `- Prisma marked unavailable: ${!!prismaCandidate?.__databaseUnavailable}\n` +
        `- Prisma unavailable reason: ${prismaCandidate?.__databaseUnavailableReason ?? 'n/a'}\n` +
        `- User methods available: ${!!prismaCandidate?.user}\n` +
        `- findUnique method: ${typeof prismaCandidate?.user?.findUnique === 'function'}\n` +
        `- create method: ${typeof prismaCandidate?.user?.create === 'function'}\n` +
        `- company.create method: ${typeof prismaCandidate?.company?.create === 'function'}\n` +
        `- DATABASE_URL configured: ${!!process.env.DATABASE_URL}\n` +
        `- Environment: ${process.env.NODE_ENV}\n\n` +
        `Please check your database configuration and ensure your Supabase connection is working.`,
        {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }
      );
    }

    // If we have a working Prisma client, perform the actual registration
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
        role: 'OWNER',  // Use string literal instead of Role.OWNER to avoid import issues
        proTrialEndsAt: trialEndsAt,
        proTrialReminderSent: false,
      },
    });

    const company = await prisma.company.create({
      data: {
        name: `${defaultName}'s Workspace`,
        ownerId: user.id,
      },
    });

    // Update the user with the company ID
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
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return new Response(
      `Registration failed. Please try again.\n\nDebug info:\n${errorMessage}\n\n${process.env.NODE_ENV === 'development' ? errorStack : ''}`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }
    );
  }
}
