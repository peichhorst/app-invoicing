import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    select: { id: true, timezone: true },
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

  const bookedSlots = bookings
    .map((booking) => {
      const start = booking.startTime;
      const date = start.toLocaleDateString('en-CA', { timeZone: hostTimezone });
      const localTime = start.toLocaleTimeString('en-US', {
        timeZone: hostTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      return {
        date,
        startTime: start.toISOString(),
        localTime,
      };
    })
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      if (a.startTime !== b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return 0;
    });

  return NextResponse.json(
    { availability, bookedSlots, hostTimezone },
    { headers: corsHeaders },
  );
}
