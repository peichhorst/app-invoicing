import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        client: true,
        proposal: true,
        user: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    if (contract.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(contract);
  } catch (error: any) {
    console.error('Error fetching contract:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contract' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.contract.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(contract);
  } catch (error: any) {
    console.error('Error updating contract:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update contract' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.contract.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.contract.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting contract:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete contract' },
      { status: 500 }
    );
  }
}
