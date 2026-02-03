import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/google-calendar';
import prisma from '@/lib/prisma';

/**
 * Initiate Google Calendar OAuth flow
 * GET /api/auth/google/calendar
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from session or auth header
    // Adjust this based on your auth implementation
    const userId = request.headers.get('x-user-id') || request.cookies.get('userId')?.value;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in first.' },
        { status: 401 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate OAuth URL with user ID in state
    const authUrl = getGoogleAuthUrl(userId);

    // Redirect to Google OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Google Calendar OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
