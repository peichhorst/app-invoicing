import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const companyId = user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 });
    }

    const positions = await prisma.position.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const companyId = user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 });
    }

    const { name } = await request.json();
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Position name is required' }, { status: 400 });
    }

    // Get the highest order number
    const lastPosition = await prisma.position.findFirst({
      where: { companyId },
      orderBy: { order: 'desc' },
    });

    const newOrder = (lastPosition?.order ?? 0) + 1;

    const position = await prisma.position.create({
      data: {
        companyId,
        name: name.trim(),
        order: newOrder,
        isCustom: true,
      },
    });

    return NextResponse.json(position);
  } catch (error) {
    console.error('Error creating position:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Position name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
