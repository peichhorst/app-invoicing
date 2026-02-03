import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the proposal
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (proposal.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (proposal.status !== 'SIGNED') {
      return NextResponse.json(
        { error: 'Only signed proposals can be converted to contracts' },
        { status: 400 }
      );
    }

    // Check if contract already exists
    const existingContract = await prisma.contract.findUnique({
      where: { proposalId: id },
    });

    if (existingContract) {
      return NextResponse.json(
        { error: 'This proposal has already been converted to a contract', contractId: existingContract.id },
        { status: 400 }
      );
    }

    // Create contract from proposal
    const contract = await prisma.contract.create({
      data: {
        proposalId: id,
        userId: user.id,
        clientId: proposal.clientId,
        title: proposal.title,
        terms: proposal.scope || proposal.description || 'Terms to be defined',
        status: 'signed',
        signedAt: proposal.signedAt,
      },
    });

    return NextResponse.json({ success: true, contractId: contract.id });
  } catch (error: any) {
    console.error('Error converting proposal to contract:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to convert to contract' },
      { status: 500 }
    );
  }
}
