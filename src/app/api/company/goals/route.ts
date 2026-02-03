import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners and admins can set company goals
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const companyId = user.companyId || user.company?.id;
    if (!companyId) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 });
    }

    const body = await request.json();
    const { revenueGoalMonthly, revenueGoalQuarterly, revenueGoalYearly } = body;

    const updateData: Record<string, number | null> = {};
    if (typeof revenueGoalMonthly === 'number') updateData.revenueGoalMonthly = revenueGoalMonthly;
    if (typeof revenueGoalQuarterly === 'number') updateData.revenueGoalQuarterly = revenueGoalQuarterly;
    if (typeof revenueGoalYearly === 'number') updateData.revenueGoalYearly = revenueGoalYearly;

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: updateData,
      select: {
        id: true,
        revenueGoalMonthly: true,
        revenueGoalQuarterly: true,
        revenueGoalYearly: true,
      },
    });

    return NextResponse.json({ success: true, company: updatedCompany });
  } catch (error) {
    console.error('Error updating company goals:', error);
    return NextResponse.json({ error: 'Failed to update goals' }, { status: 500 });
  }
}
