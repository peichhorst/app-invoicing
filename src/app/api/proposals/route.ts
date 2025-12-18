import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProposalStatus } from '@prisma/client';
import { clientVisibilityWhere } from '@/lib/client-scope';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      clientId,
      title,
      description,
      scope,
      validUntil,
      notes,
      items,
      total,
      status = 'DRAFT',
    } = body;

    if (!clientId || !title || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify client belongs to user
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        ...clientVisibilityWhere(user),
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Create proposal
    const proposal = await prisma.proposal.create({
      data: {
        userId: user.id,
        clientId,
        title,
        description: description || null,
        scope: scope || null,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
        total,
        lineItems: JSON.stringify(items),
        status,
      },
      include: {
        client: true,
      },
    });

    // If status is SENT, you might want to send an email here
    // if (status === 'SENT') {
    //   await sendProposalEmail(proposal, client);
    // }

    return NextResponse.json(proposal);
  } catch (error) {
    console.error('Error creating proposal:', error);
    return NextResponse.json(
      { error: 'Failed to create proposal' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const proposals = await prisma.proposal.findMany({
      where: {
        userId: user.id,
        ...(status && status !== 'all' ? { status: status as ProposalStatus } : {}),
      },
      include: {
        client: true,
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(proposals);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposals' },
      { status: 500 }
    );
  }
}
