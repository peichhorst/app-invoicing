import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const resolvedParams = await params;
    const positionId = resolvedParams.id;
    const { action, targetIndex } = await request.json();

    if (!['moveUp', 'moveDown', 'reorder'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const companyId = user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 });
    }

    // Get the position to move
    const position = await prisma.position.findFirst({
      where: { id: positionId, companyId },
    });

    if (!position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    if (action === 'reorder') {
      if (typeof targetIndex !== 'number' || Number.isNaN(targetIndex)) {
        return NextResponse.json({ error: 'targetIndex is required for reorder' }, { status: 400 });
      }

      const positions = await prisma.position.findMany({
        where: { companyId },
        orderBy: { order: 'asc' },
      });

      const currentIndex = positions.findIndex((p) => p.id === positionId);
      if (currentIndex === -1) {
        return NextResponse.json({ error: 'Position not found' }, { status: 404 });
      }

      const clampedTarget = Math.max(0, Math.min(targetIndex, positions.length - 1));
      if (clampedTarget === currentIndex) {
        return NextResponse.json(positions);
      }

      const reordered = [...positions];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(clampedTarget, 0, moved);

      await prisma.$transaction(
        reordered.map((p, idx) =>
          prisma.position.update({
            where: { id: p.id },
            data: { order: idx + 1 },
          }),
        ),
      );

      return NextResponse.json(reordered);
    }

    // For moveUp/moveDown, swap with adjacent
    const adjacentPosition = await prisma.position.findFirst({
      where: {
        companyId,
        order: action === 'moveUp' ? position.order - 1 : position.order + 1,
      },
    });

    if (!adjacentPosition) {
      return NextResponse.json({ error: 'Cannot move position further' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.position.update({
        where: { id: position.id },
        data: { order: adjacentPosition.order },
      }),
      prisma.position.update({
        where: { id: adjacentPosition.id },
        data: { order: position.order },
      }),
    ]);

    // Return updated positions
    const positions = await prisma.position.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(positions);
  } catch (error) {
    console.error('Error updating position:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const resolvedParams = await params;
    const positionId = resolvedParams.id;

    const companyId = user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 });
    }

    // Check if position exists and is custom
    const position = await prisma.position.findFirst({
      where: { id: positionId, companyId, isCustom: true },
    });

    if (!position) {
      return NextResponse.json({ error: 'Position not found or cannot be deleted' }, { status: 404 });
    }

    // Check if position is being used by any users
    const usersUsingPosition = await prisma.user.count({
      where: { positionId: positionId },
    });

    if (usersUsingPosition > 0) {
      return NextResponse.json({ error: 'Cannot delete position that is assigned to users' }, { status: 400 });
    }

    await prisma.position.delete({
      where: { id: positionId },
    });

    // Reorder remaining positions
    const remainingPositions = await prisma.position.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
    });

    // Update orders to be sequential
    for (let i = 0; i < remainingPositions.length; i++) {
      await prisma.position.update({
        where: { id: remainingPositions[i].id },
        data: { order: i + 1 },
      });
    }

    const updatedPositions = await prisma.position.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(updatedPositions);
  } catch (error) {
    console.error('Error deleting position:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
