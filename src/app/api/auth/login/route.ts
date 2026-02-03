// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { createSession, verifyPassword, sessionCookieOptions } from '../../../../lib/auth';

type LoginPayload = {
  email?: string;
  password?: string;
};

// Get Prisma client using the same method as other auth functions
function getPrismaClient() {
  try {
    // Use synchronous require to avoid caching issues during development
    const { prisma } = require('../../../../lib/prisma');
    return prisma;
  } catch (error) {
    console.error('Failed to import Prisma client:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginPayload;
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const prisma = getPrismaClient();
    
    if (!prisma) {
      return new Response(
        JSON.stringify({ error: 'Database unavailable.' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if prisma has the expected methods (handle Prisma v7 compatibility)
    if (typeof prisma.user?.findUnique !== 'function') {
      console.warn('Prisma user.findUnique not available, using mock user lookup');
      
      // Try to find user in mock database
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) {
          return new Response(
            JSON.stringify({ error: 'Invalid credentials.' }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        // Verify password using bcrypt
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
      } catch (error) {
        console.error('Mock user lookup failed:', error);
        return new Response(
          JSON.stringify({ error: 'Authentication failed.' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Use real Prisma client
    const user = await prisma.user.findUnique({ where: { email } });
    
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
        error: 'Login failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}