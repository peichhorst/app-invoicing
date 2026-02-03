import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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

    const alreadyAcked = resource.acknowledgments.some((ack) => ack.userId === user.id);
    if (alreadyAcked) {
      return NextResponse.json({ success: true, alreadyAcknowledged: true });
    }

    await prisma.resourceAcknowledgment.create({
      data: {
        resourceId: resource.id,
        userId: user.id,
      },
    });

    await prisma.resource.update({
      where: { id: resource.id },
      data: {
        acknowledgedBy: { push: user.id },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[acknowledge] failed', error);
    return NextResponse.json({ error: 'Unable to save acknowledgment' }, { status: 500 });
  }
}
