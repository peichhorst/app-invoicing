// src/app/api/auth/request-magic-link/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendMagicLoginEmail } from '@/lib/email';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        company: {
          select: {
            primaryColor: true,
          },
        },
      },
    });

    // For security, always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      return NextResponse.json({ 
        success: true, 
        message: 'If this email is registered, a magic link has been sent.' 
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create magic link record
    await prisma.magicLink.create({
      data: {
        token,
        email: normalizedEmail,
        expiresAt,
      },
    });

    // Send email
    await sendMagicLoginEmail(normalizedEmail, token, user.company?.primaryColor ?? null);

    return NextResponse.json({ 
      success: true, 
      message: 'If this email is registered, a magic link has been sent.' 
    });
  } catch (error) {
    console.error('Error creating magic link:', error);
    return NextResponse.json(
      { error: 'Failed to send magic link' },
      { status: 500 }
    );
  }
}
