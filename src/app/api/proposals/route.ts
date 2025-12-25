import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProposalStatus } from '@prisma/client';
import { clientVisibilityWhere } from '@/lib/client-scope';
import { sendEmail } from '@/lib/email';

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
      type: rawType,
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
    const normalizedType =
      rawType && typeof rawType === 'string' && rawType.toUpperCase() === 'CONTRACT'
        ? 'CONTRACT'
        : 'PROPOSAL';

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
        type: normalizedType,
    },
      include: {
        client: true,
      },
    });

    if (status === 'SENT') {
      notifyClientAboutProposal(proposal, proposal.client, user).catch((err) => {
        console.error('Failed to send proposal email', err);
      });
    }

    return NextResponse.json(proposal);
  } catch (error) {
    console.error('Error creating proposal:', error);
    return NextResponse.json(
      { error: 'Failed to create proposal' },
      { status: 500 }
    );
  }
}

async function notifyClientAboutProposal(proposal: any, client: any, user: any) {
  if (!client?.email) return;
  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clientwave.app';
  const proposalLink = `${appBase}/p/${proposal.id}/view`;
  const rawItems = JSON.parse(proposal.lineItems || '[]');
  const parsedItems = Array.isArray(rawItems) ? rawItems : [];
  const subtotal = parsedItems.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);
  const totals = {
    subtotal,
    total: Number(proposal.total) || subtotal,
    currency: proposal.currency || 'USD',
  };
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: totals.currency,
  }).format(totals.total);
  const companyName = user?.company?.name || user?.companyName || 'Your Company';
  const docLabel = proposal.type === 'CONTRACT' ? 'contract' : 'proposal';
  const docTitle = proposal.type === 'CONTRACT' ? 'Contract' : 'Proposal';

  const html = `
    <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:24px;">
      <h1 style="color:#111; margin-bottom:12px;">New ${docLabel} from ${companyName}</h1>
      <p style="margin-bottom:12px; color:#444;">Title: <strong>${proposal.title}</strong></p>
      <p style="margin-bottom:12px; color:#111;">Total: <strong>${formattedTotal}</strong></p>
      <a href="${proposalLink}" style="display:inline-block; margin-bottom:16px; padding:12px 24px; background:#4f46e5; color:white; text-decoration:none; border-radius:8px; font-weight:600;">
        View & Sign ${docTitle}
      </a>
      <p style="margin:0; color:#1f2937;">${proposal.notes || 'Review and sign to lock in the details.'}</p>
    </div>
  `;

  await sendEmail({
    from: process.env.RESEND_FROM || 'invoices@858webdesign.com',
    to: [client.email],
    subject: `New ${docLabel} from ${companyName}`,
    html,
  });
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
