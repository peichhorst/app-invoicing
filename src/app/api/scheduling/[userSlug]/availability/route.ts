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
    .map((booking) => ({
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime?.toISOString() ?? null,
    }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return NextResponse.json(
    { availability, bookedSlots, hostTimezone: user.timezone ?? 'America/Los_Angeles' },
    { headers: corsHeaders },
  );
}
