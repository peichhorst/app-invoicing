import { NextRequest, NextResponse } from 'next/server';
import { disconnectGoogleCalendar, stopGoogleCalendarWatch } from '@/lib/google-calendar';

/**
 * Disconnect Google Calendar
 * DELETE /api/auth/google/calendar/disconnect
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get user ID from session
    const userId = request.headers.get('x-user-id') || request.cookies.get('userId')?.value;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Stop the watch channel first
    try {
      await stopGoogleCalendarWatch(userId);
    } catch (watchError) {
      console.error('Failed to stop watch, but continuing:', watchError);
    }

    await disconnectGoogleCalendar(userId);

    return NextResponse.json({ success: true, message: 'Google Calendar disconnected' });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google Calendar' },
      { status: 500 }
    );
  }
}
