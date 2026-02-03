import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing proposal id' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const signatureDataUrl =
    typeof body.signatureDataUrl === 'string' && body.signatureDataUrl.trim()
      ? body.signatureDataUrl.trim()
      : null;
  const signerName = typeof body.name === 'string' ? body.name.trim() : '';

  if (!signatureDataUrl) {
    return NextResponse.json({ error: 'Signature is required' }, { status: 400 });
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      client: true,
      user: { include: { company: true } },
    },
  });

  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (!['SENT', 'VIEWED'].includes(proposal.status)) {
    return NextResponse.json(
      { error: 'Proposal must be in SENT or VIEWED status to sign' },
      { status: 400 }
    );
  }

  const updated = await prisma.proposal.update({
    where: { id },
    data: {
      status: 'SIGNED',
      signedAt: new Date(),
      signedById: proposal.clientId,
      signatureUrl: signatureDataUrl,
    },
    include: {
      client: true,
      user: { include: { company: true } },
    },
  });

  const companyName = updated.user?.company?.name || updated.user?.companyName || 'Your Company';
  const clientEmail = updated.client?.email;
  const ownerEmail = updated.user?.email;
  const clientName = updated.client?.contactName || updated.client?.companyName || signerName || 'Client';
  const docLabel = updated.type === 'CONTRACT' ? 'contract' : 'proposal';
  const docTitle = updated.type === 'CONTRACT' ? 'Contract' : 'Proposal';

  const html = `
    <div style="font-family:system-ui,sans-serif; max-width:600px; margin:0 auto; padding:24px;">
      <h1 style="color:#111; margin-bottom:12px;">${docTitle} signed</h1>
      <p style="margin-bottom:12px; color:#444;">${clientName} signed the ${docLabel} titled <strong>${updated.title}</strong>.</p>
      <p style="margin-bottom:12px; color:#444;">Amount: <strong>${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: updated.currency || 'USD',
      }).format(Number(updated.total) || 0)}</strong></p>
      <p style="margin-bottom:12px; color:#444;">Status: ${updated.status}</p>
    </div>
  `;

  // Use the improved email function that includes PDF URL if available
  await import('@/lib/email').then(({ sendProposalSignedNotification }) => {
    sendProposalSignedNotification(updated, updated.client, updated.user).catch((error) => {
      console.error('Failed to notify about signed proposal', error);
    });
  }).catch((error) => {
    console.error('Failed to import email function', error);
  });

  return NextResponse.json({
    status: updated.status,
    signedOn: updated.signedAt?.toISOString(),
  });
}
