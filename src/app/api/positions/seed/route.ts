import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const companyId = user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 });
    }

    // Check if positions already exist
    const existingPositions = await prisma.position.count({
      where: { companyId },
    });

    if (existingPositions > 0) {
      return NextResponse.json({ message: 'Positions already seeded' });
    }

    const defaultPositions = [
      { name: 'Executive', order: 1 },
      { name: 'Director', order: 2 },
      { name: 'Manager', order: 3 },
      { name: 'Team Lead', order: 4 },
      { name: 'Senior', order: 5 },
      { name: 'Associate', order: 6 },
      { name: 'Junior', order: 7 },
      { name: 'Intern', order: 8 },
    ];

    for (const position of defaultPositions) {
      await prisma.position.create({
        data: {
          companyId,
          name: position.name,
          order: position.order,
          isCustom: false,
        },
      });
    }

    return NextResponse.json({ message: 'Default positions seeded successfully' });
  } catch (error) {
    console.error('Error seeding positions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}