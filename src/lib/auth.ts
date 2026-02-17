// src/lib/auth.ts
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import * as crypto from 'crypto';

// Import prisma directly - Prisma v5 works fine with direct imports in Next.js
import prisma from './prisma';

// Define minimal types to avoid dependency on @prisma/client
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  planTier: string;
  proTrialEndsAt?: Date | string;
  proTrialReminderSent?: boolean;
  companyId?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: any;
}

interface Company {
  id: string;
  name: string;
  ownerId: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: any;
}

interface Position {
  id: string;
  name: string;
}

// Define the combined types
type UserWithCompany = User & { company?: Company | null };
type UserWithPosition = User & { positionCustom?: Position | null };
import { ensureTrialState } from './plan';

export const SESSION_COOKIE = 'session_token';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function getPrismaClient() {
  // Return the imported prisma client directly
  return prisma;
}

export async function createSession(userId: string) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  const prisma = getPrismaClient();
  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function sessionCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieDomain = isProd
    ? process.env.COOKIE_DOMAIN ||
      (() => {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL;
          if (!appUrl) return undefined;
          const hostname = new URL(appUrl).hostname;
          if (hostname.endsWith('.clientwave.app') || hostname === 'clientwave.app') {
            return '.clientwave.app';
          }
          return hostname;
        } catch {
          return undefined;
        }
      })()
    : undefined;
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only secure in production
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  };
}

export async function destroySession(token?: string) {
  const cookieStore = await cookies();
  const existingToken = token || cookieStore.get(SESSION_COOKIE)?.value;
  if (existingToken) {
    const prisma = getPrismaClient();
    await prisma.session.deleteMany({ where: { token: existingToken } });
  }
}

export async function getCurrentUser(): Promise<(User & { company?: Company | null; positionCustom?: Position | null }) | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const prisma = getPrismaClient();
  if (!prisma) {
    console.warn('Prisma client not available, returning null user');
    return null;
  }

  // Your real session logic (adapt as needed, e.g., for NextAuth custom session)
  let session;
  try {
    session = await prisma.session.findUnique({
      where: { token },
    });
    
    // Manually populate the user relationship since Prisma relations might not be included
    if (session) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId }
      });
      
      if (user) {
        // Find the user's company using the correct field name
        const company = await prisma.company.findUnique({
          where: { id: user.companyId || '' }
        });
        
        // For positionCustom, return null since we don't have a position table in our mock
        (session as any).user = {
          ...user,
          company,
          positionCustom: null
        };
      }
    }
  } catch (err) {
    console.error('Prisma session query failed:', err);
    return null;
  }

  if (!session) return null;

  if (session.expiresAt) {
    // Handle both string and Date formats for expiresAt
    let expiresAtDate: Date;
    if (typeof session.expiresAt === 'string') {
      expiresAtDate = new Date(session.expiresAt);
    } else if (session.expiresAt instanceof Date) {
      expiresAtDate = session.expiresAt;
    } else {
      console.error('Invalid expiresAt format:', typeof session.expiresAt);
      return null;
    }
    
    if (expiresAtDate.getTime() < Date.now()) {
      try {
        const prisma = getPrismaClient();
        await prisma.session.delete({ where: { token } });
      } catch (error) {
        console.error('Failed to delete expired session:', error);
      }
      return null;
    }
  }

  if (!session.user) {
    console.error('Session found but user not included or not found');
    return null;
  }

  // Ensure the user object has required fields
  const userWithDefaults = {
    ...session.user,
    role: session.user.role || 'USER',
    planTier: session.user.planTier || 'FREE'
  };

  const updated = await ensureTrialState(userWithDefaults);
  return updated;
}
