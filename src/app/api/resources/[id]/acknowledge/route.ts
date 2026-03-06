import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

function parseStoredStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  }
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  const matcher = request.nextUrl.pathname.match(/\/resources\/([^/]+)\/acknowledge$/);
  const resourceId = matcher?.[1];

  if (!resourceId) {
    return NextResponse.json({ error: 'Missing resource id' }, { status: 400 });
  }
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        acknowledgments: { select: { userId: true } },
      },
    });

    if (!resource || resource.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    if (!resource.requiresAcknowledgment) {
      return NextResponse.json({ error: 'Acknowledgment not required' }, { status: 400 });
    }

    const alreadyAcked = resource.acknowledgments.some((ack: { userId: string }) => ack.userId === user.id);
    if (alreadyAcked) {
      return NextResponse.json({ success: true, alreadyAcknowledged: true });
    }

    await prisma.resourceAcknowledgment.create({
      data: {
        resourceId: resource.id,
        userId: user.id,
      },
    });

    const existingAckedBy = parseStoredStringArray((resource as any).acknowledgedBy);
    const updatedAckedBy = existingAckedBy.includes(user.id) ? existingAckedBy : [...existingAckedBy, user.id];

    await prisma.resource.update({
      where: { id: resource.id },
      data: {
        acknowledgedBy: JSON.stringify(updatedAckedBy),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[acknowledge] failed', error);
    return NextResponse.json({ error: 'Unable to save acknowledgment' }, { status: 500 });
  }
}
