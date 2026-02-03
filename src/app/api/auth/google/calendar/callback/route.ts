import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, saveGoogleTokens, setupGoogleCalendarWatch } from '@/lib/google-calendar';

/**
 * Handle Google Calendar OAuth callback
 * GET /api/auth/google/calendar/callback
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This is the user ID
    const error = searchParams.get('error');

    // Handle user denying access
    if (error === 'access_denied') {
      const dashboardUrl = new URL('/dashboard/profile', request.url);
      dashboardUrl.searchParams.set('error', 'Google Calendar connection cancelled');
      return NextResponse.redirect(dashboardUrl);
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing authorization code or state' },
        { status: 400 }
      );
    }

    const userId = state;

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Save tokens to database
    await saveGoogleTokens(
      userId,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in,
      tokens.email
    );

    // Set up watch channel for push notifications
    try {
      await setupGoogleCalendarWatch(userId);
      console.log('✅ Google Calendar watch setup for user:', userId);
    } catch (watchError) {
      console.error('Failed to setup watch, but continuing:', watchError);
      // Don't fail the connection if watch setup fails
    }

    // Redirect back to settings page with success message
    const dashboardUrl = new URL('/dashboard/profile', request.url);
    dashboardUrl.searchParams.set('success', 'Google Calendar connected successfully!');
    return NextResponse.redirect(dashboardUrl);
  } catch (error) {
    console.error('Error handling Google Calendar callback:', error);
    
    const dashboardUrl = new URL('/dashboard/profile', request.url);
    dashboardUrl.searchParams.set('error', 'Failed to connect Google Calendar');
    return NextResponse.redirect(dashboardUrl);
  }
}
