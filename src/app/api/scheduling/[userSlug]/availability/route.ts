import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getGoogleCalendarBusyTimes } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Vary': 'Origin',
};

const normalizeSlug = (slug: string): string => slug.trim().toLowerCase();
const slugToName = (slug: string): string =>
  slug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

// Handle preflight
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET handler — no RouteHandlerContext needed
export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/');
  const userSlug = segments[segments.length - 2]?.trim(); // [userSlug] is second-last

  if (!userSlug) {
    return NextResponse.json({ error: 'Missing user slug' }, { status: 400, headers: corsHeaders });
  }

  const normalizedSlug = normalizeSlug(userSlug);
  const nameCandidate = slugToName(normalizedSlug);


  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: normalizedSlug },
        { email: normalizedSlug },
        { name: { equals: nameCandidate, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      timezone: true,
      company: {
        select: {
          primaryColor: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders });
  }

  const hostTimezone = user.timezone ?? 'America/Los_Angeles';

  console.log('availability request', {
    slug: normalizedSlug,
    userId: user.id,
    now: new Date().toISOString(),
  });

  const availability = await prisma.availability.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { dayOfWeek: 'asc' },
    select: {
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      duration: true,
      buffer: true,
    },
  });

  const now = new Date();
  const future = new Date(now);
  future.setMonth(future.getMonth() + 12);

  const bookings = await prisma.booking.findMany({
    where: {
      userId: user.id,
      startTime: { lt: future },
    },
    select: { startTime: true, endTime: true },
  });

  console.log('bookings fetched', { count: bookings.length, userId: user.id, now: now.toISOString(), future: future.toISOString() });

  // Fetch Google Calendar busy times if connected
  // Note: Google Calendar FreeBusy API has a max 3-month window
  let googleBusyTimes: Array<{ start: Date; end: Date }> = [];
  try {
    const googleFuture = new Date(now);
    googleFuture.setMonth(googleFuture.getMonth() + 3); // Limit to 3 months for Google API
    googleBusyTimes = await getGoogleCalendarBusyTimes(user.id, now, googleFuture);
    console.log('Google Calendar busy times fetched', { count: googleBusyTimes.length, userId: user.id });
    if (googleBusyTimes.length > 0) {
      console.log('Google busy times:', googleBusyTimes.map(b => ({ 
        start: b.start.toISOString(), 
        end: b.end.toISOString() 
      })));
    }
  } catch (error) {
    console.error('Error fetching Google Calendar busy times:', error);
    // Continue without Google Calendar data
  }

  // Helper to parse time string like "09:00" to minutes
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Helper to format minutes back to HH:MM
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // Generate all possible slots from availability
  const generateSlots = (dayConfig: typeof availability[0], date: Date) => {
    const slots: Array<{ start: Date; end: Date; startTime24: string }> = [];
    const startMin = parseTime(dayConfig.startTime);
    const endMin = parseTime(dayConfig.endTime);
    const duration = dayConfig.duration || 30;
    const buffer = dayConfig.buffer || 0;
    
    let cursor = startMin;
    while (cursor + duration <= endMin) {
      const slotStart = new Date(date);
      slotStart.setHours(Math.floor(cursor / 60), cursor % 60, 0, 0);
      
      const slotEnd = new Date(date);
      slotEnd.setHours(Math.floor((cursor + duration) / 60), (cursor + duration) % 60, 0, 0);
      
      slots.push({
        start: slotStart,
        end: slotEnd,
        startTime24: formatTime(cursor),
      });
      
      cursor += duration + buffer;
    }
    return slots;
  };

  // Check if a Google Calendar event overlaps with a time slot
  const hasOverlap = (slotStart: Date, slotEnd: Date, busyPeriods: typeof googleBusyTimes): boolean => {
    return busyPeriods.some(busy => {
      // Two time periods overlap if: start1 < end2 && end1 > start2
      return slotStart < busy.end && slotEnd > busy.start;
    });
  };

  // Build list of blocked slots from Google Calendar
  const googleBlockedSlots: Array<{ date: string; startTime: string }> = [];
  
  // For each day in the next 30 days
  for (let offset = 0; offset < 30; offset++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + offset);
    checkDate.setHours(0, 0, 0, 0);
    
    const dayOfWeek = checkDate.getDay();
    const dayConfig = availability.find((a: typeof availability[0]) => a.dayOfWeek === dayOfWeek);
    
    if (!dayConfig) continue;
    
    // Generate all slots for this day
    const daySlots = generateSlots(dayConfig, checkDate);
    
    // Check each slot against Google Calendar busy times
    daySlots.forEach(slot => {
      if (hasOverlap(slot.start, slot.end, googleBusyTimes)) {
        const dateKey = slot.start.toLocaleDateString('en-CA', { timeZone: hostTimezone });
        googleBlockedSlots.push({
          date: dateKey,
          startTime: slot.startTime24,
        });
        console.log('Blocking slot due to Google Calendar:', {
          date: dateKey,
          time: slot.startTime24,
          slotStart: slot.start.toISOString(),
          slotEnd: slot.end.toISOString(),
        });
      }
    });
  }

  // Combine app bookings and Google Calendar blocked slots
  const allBusySlots = [
    ...bookings.map((b: { startTime: Date; endTime: Date }) => {
      const start = b.startTime;
      const startTime24 = start.toLocaleTimeString('en-US', {
        timeZone: hostTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const date = start.toLocaleDateString('en-CA', { timeZone: hostTimezone });
      return { date, startTime: startTime24, source: 'booking' };
    }),
    ...googleBlockedSlots.map(s => ({ ...s, source: 'google' })),
  ];

  const bookedSlots = allBusySlots
    .map((slot) => ({
      date: slot.date, // already YYYY-MM-DD in host TZ
      startTime: slot.startTime, // already HH:mm in host TZ
      localTime: new Date(`2000-01-01T${slot.startTime}:00`).toLocaleTimeString('en-US', {
        timeZone: hostTimezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    }))
    .sort((a: { date: string; startTime: string; localTime: string }, b: { date: string; startTime: string; localTime: string }) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      if (a.startTime !== b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return 0;
    });

  console.log('Total blocked slots:', bookedSlots.length, {
    fromBookings: bookings.length,
    fromGoogle: googleBlockedSlots.length,
  });

  // Debug: log bookedSlots to the page for inspection
  console.log('API returning bookedSlots:', JSON.stringify(bookedSlots, null, 2));
  return NextResponse.json(
    {
      availability,
      bookedSlots,
      hostTimezone,
      primaryColor: user.company?.primaryColor ?? null,
      __debugBookedSlots: bookedSlots, // Expose for frontend debug
    },
    { headers: corsHeaders },
  );
}
