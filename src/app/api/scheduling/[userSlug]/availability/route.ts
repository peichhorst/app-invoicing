import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const normalizeSlug = (slug: string): string => slug.trim().toLowerCase();

const slugToName = (slug: string): string => slug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

export async function GET(
  _request: Request,
  { params }: { params: { userSlug?: string } },
) {
  const userSlug = params?.userSlug?.trim();
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
    select: {
      id: true,
    },
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

  return NextResponse.json({ availability });
}
