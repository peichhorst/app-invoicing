import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      clientId,
      title,
      terms,
      paymentMilestones,
      timeline,
      revisionsIncluded,
      additionalRevisionRate,
      ipOwnership,
      cancellationTerms,
      liabilityCap,
      governingLaw,
      disputeResolution,
      status = 'draft',
      proposalId,
    } = body;

    if (!title || !terms) {
      return NextResponse.json({ error: 'Title and terms are required' }, { status: 400 });
    }

    const contract = await prisma.contract.create({
      data: {
        userId: user.id,
        clientId: clientId || null,
        proposalId: proposalId || null,
        title,
        terms,
        paymentMilestones: paymentMilestones || null,
        timeline: timeline || null,
        revisionsIncluded: revisionsIncluded || null,
        additionalRevisionRate: additionalRevisionRate || null,
        ipOwnership: ipOwnership || null,
        cancellationTerms: cancellationTerms || null,
        liabilityCap: liabilityCap || null,
        governingLaw: governingLaw || null,
        disputeResolution: disputeResolution || null,
        status,
      },
    });

    return NextResponse.json(contract);
  } catch (error: any) {
    console.error('Error creating contract:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create contract' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contracts = await prisma.contract.findMany({
      where: { userId: user.id },
      include: {
        client: true,
        proposal: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(contracts);
  } catch (error: any) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch contracts' },
      { status: 500 }
    );
  }
}
