import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const normalizeSlug = (slug: string): string => slug.trim().toLowerCase();
const slugToName = (slug: string): string => slug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

export async function GET(request: NextRequest) {
  const pathSegments = request.nextUrl.pathname.split('/');
  const userSlug = pathSegments[3]?.trim();

  if (!userSlug) {
    return NextResponse.json({ error: 'Missing user slug' }, { status: 400 });
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
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

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
  future.setDate(future.getDate() + 30);

  const bookings = await prisma.booking.findMany({
    where: {
      userId: user.id,
      startTime: {
        gte: now,
        lt: future,
      },
    },
    select: { startTime: true },
  });

  const bookedSlots = bookings
    .map((booking) => {
      const start = booking.startTime;
      const date = start.toISOString().split('T')[0];
      const hours = String(start.getHours()).padStart(2, '0');
      const minutes = String(start.getMinutes()).padStart(2, '0');
      return {
        date,
        startTime: `${hours}:${minutes}`,
      };
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });

  const response = NextResponse.json({ availability, bookedSlots });

  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*'); // or specific domain for security
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

// Handle preflight OPTIONS request
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}