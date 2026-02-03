import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    
    if (
      !currentUser ||
      (currentUser.role !== 'OWNER' &&
        currentUser.role !== 'ADMIN' &&
        currentUser.role !== 'SUPERADMIN')
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create magic link record
    await prisma.magicLink.create({
      data: {
        token,
        email: targetUser.email,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.clientwave.app';
    const magicLink = `${baseUrl}/api/auth/magic-login?token=${token}`;

    return NextResponse.json({ 
      success: true,
      magicLink,
      user: targetUser,
      expiresAt,
    });
  } catch (error) {
    console.error('Error generating magic link:', error);
    return NextResponse.json(
      { error: 'Failed to generate magic link' },
      { status: 500 }
    );
  }
}
