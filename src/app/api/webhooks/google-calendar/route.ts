import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Webhook endpoint for Google Calendar push notifications
 * Google will POST to this endpoint when calendar changes occur
 */
export async function POST(request: NextRequest) {
  try {
    // Get headers from Google's notification
    const channelId = request.headers.get('x-goog-channel-id');
    const resourceId = request.headers.get('x-goog-resource-id');
    const resourceState = request.headers.get('x-goog-resource-state');
    const channelToken = request.headers.get('x-goog-channel-token');

    console.log('📅 Google Calendar webhook received:', {
      channelId,
      resourceId,
      resourceState,
      channelToken,
    });

    if (!channelId || !resourceId) {
      console.error('Missing required Google webhook headers');
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
    }

    // Find the user who owns this watch channel
    const user = await prisma.user.findFirst({
      where: {
        googleWatchChannelId: channelId,
        googleWatchResourceId: resourceId,
      },
      select: { id: true, email: true },
    });

    if (!user) {
      console.error('No user found for watch channel:', { channelId, resourceId });
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Handle different resource states
    if (resourceState === 'sync') {
      // Initial sync message - just acknowledge
      console.log('✅ Google Calendar watch sync confirmed for user:', user.email);
      return NextResponse.json({ success: true, message: 'Sync acknowledged' });
    }

    if (resourceState === 'exists') {
      // Calendar has changes - trigger a refresh
      console.log('🔄 Google Calendar changed for user:', user.email);
      
      // Here you could:
      // 1. Queue a job to refresh bookings
      // 2. Invalidate cached availability
      // 3. Trigger a real-time update to connected clients
      // For now, we'll just log it
      console.log('📌 Calendar refresh needed for user:', user.id);
      
      // Optional: You could clear any cached availability data here
      // or trigger a background job to sync changes
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing Google Calendar webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

/**
 * Verification endpoint for Google Calendar watch setup
 * Google may send GET requests to verify the endpoint
 */
export async function GET(request: NextRequest) {
  // Some webhook systems send verification requests
  const token = request.nextUrl.searchParams.get('token');
  console.log('Google Calendar webhook verification request', { token });
  
  return NextResponse.json({ 
    status: 'ok',
    message: 'Google Calendar webhook endpoint is active' 
  });
}
