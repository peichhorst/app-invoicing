import { NextRequest, NextResponse } from 'next/server';
import { generateICSFile, type CalendarEvent } from '@/lib/calendar';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Fetch booking details from database
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Create calendar event object
    const event: CalendarEvent = {
      title: `Meeting with ${booking.user.name}`,
      description: booking.notes || `Booking with ${booking.user.name}`,
      location: 'Online / Phone',
      startTime: new Date(booking.startTime),
      endTime: new Date(booking.endTime),
      attendeeEmail: booking.clientEmail,
      attendeeName: booking.clientName,
    };

    // Generate ICS file content
    const icsContent = generateICSFile(event);

    // Return ICS file with proper headers
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="booking-${bookingId}.ics"`,
      },
    });
  } catch (error) {
    console.error('Error generating ICS file:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar file' },
      { status: 500 }
    );
  }
}
