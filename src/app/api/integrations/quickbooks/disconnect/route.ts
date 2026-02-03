import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.companyId) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 });
    }

    // Clear QuickBooks credentials from company
    await prisma.company.update({
      where: { id: user.companyId },
      data: {
        quickbooksRealmId: null,
        quickbooksAccessToken: null,
        quickbooksRefreshToken: null,
        quickbooksTokenExpiry: null,
        quickbooksConnected: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'QuickBooks disconnected successfully',
    });
  } catch (error: any) {
    console.error('Error disconnecting QuickBooks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect QuickBooks' },
      { status: 500 }
    );
  }
}
