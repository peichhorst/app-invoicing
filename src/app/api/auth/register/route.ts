// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { createSession, hashPassword, sessionCookieOptions } from '@/lib/auth';
import { TRIAL_LENGTH_MS } from '@/lib/plan';
import { sendRegistrationAlert } from '@/lib/email';
import { Role } from '@prisma/client';

type RegisterPayload = {
  email?: string;
  password?: string;
};

// Helper function to get Prisma client
async function getPrisma() {
  try {
    const { default: prisma } = await import('@/lib/prisma');
    
    // Check if the prisma client has the expected methods (Prisma v5 compatibility)
    if (prisma && typeof prisma.user?.findUnique === 'function') {
      return prisma;
    } else {
      console.warn('Prisma client methods not available', {
        hasUser: !!prisma?.user,
        hasFindUnique: typeof prisma?.user?.findUnique === 'function',
        hasCreate: typeof prisma?.user?.create === 'function',
        prismaType: typeof prisma,
        availableMethods: prisma ? Object.keys(prisma) : []
      });
      return null;
    }
  } catch (error) {
    console.error('Failed to import Prisma client:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      databaseUrlSet: !!process.env.DATABASE_URL,
      connectionStringValid: process.env.DATABASE_URL?.includes('supabase.co') || process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('postgresql')
    });
    return null;
  }
}

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

    const prisma = await getPrisma();
    
    // Check if the Prisma client actually has the methods we need before attempting database operations
    if (!prisma || typeof prisma.user?.findUnique !== 'function' || typeof prisma.user?.create !== 'function') {
      // Log detailed error information for debugging
      console.error('Prisma client initialization failed:', {
        prismaExists: !!prisma,
        userMethodsExist: prisma ? !!prisma.user : false,
        findUniqueMethodExists: prisma ? typeof prisma.user?.findUnique === 'function' : false,
        createMethodExists: prisma ? typeof prisma.user?.create === 'function' : false,
        databaseUrlSet: !!process.env.DATABASE_URL,
        nodeEnv: process.env.NODE_ENV,
        error: 'Prisma client methods not available'
      });
      
      // If Prisma methods aren't available, use mock behavior in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Prisma client methods not available, proceeding with mock registration');
        
        // Create a mock user object
        const mockUser = {
          id: crypto.randomUUID(),
          email,
          name: email.split('@')[0] || 'Invoice User',
          createdAt: new Date(),
          updatedAt: new Date(),
          role: 'OWNER', // Using string instead of enum to avoid import issues
          planTier: 'PRO_TRIAL',
          proTrialEndsAt: new Date(Date.now() + TRIAL_LENGTH_MS),
          proTrialReminderSent: false,
          // ... other fields
        };
        
        // Try to save the user to the mock database if possible
        try {
          await prisma.user.create({
            data: {
              id: mockUser.id,
              email: mockUser.email,
              name: mockUser.name,
              password: await hashPassword(password), // Hash the password for consistency
              planTier: mockUser.planTier,
              role: mockUser.role,
              proTrialEndsAt: mockUser.proTrialEndsAt,
              proTrialReminderSent: mockUser.proTrialReminderSent,
            },
          });
          
          // Create a mock company for the user
          await prisma.company.create({
            data: {
              name: `${mockUser.name}'s Workspace`,
              ownerId: mockUser.id,
              users: { connect: { id: mockUser.id } },
            },
          });
          
          // Update the user with the company ID
          await prisma.user.update({
            where: { id: mockUser.id },
            data: { companyId: mockUser.id }, // Use the user ID as a placeholder until company is created
          });
        } catch (error) {
          console.warn('Could not save mock user to database:', error);
        }
        
        const { token } = await createSession(mockUser.id);
        
        const res = NextResponse.json({ success: true, user: mockUser });
        res.cookies.set('session_token', token, sessionCookieOptions());
        return res;
      } else {
        return new Response(
          `Database unavailable. Details:\n` +
          `- Prisma client exists: ${!!prisma}\n` +
          `- User methods available: ${!!prisma?.user}\n` +
          `- findUnique method: ${typeof prisma?.user?.findUnique === 'function'}\n` +
          `- create method: ${typeof prisma?.user?.create === 'function'}\n` +
          `- DATABASE_URL configured: ${!!process.env.DATABASE_URL}\n` +
          `- Environment: ${process.env.NODE_ENV}\n\n` +
          `Please check your database configuration and ensure your Supabase connection is working.`,
          {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          }
        );
      }
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
