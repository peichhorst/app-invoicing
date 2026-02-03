import { NextResponse, type NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { sendContractSignedEmail } from '@/lib/email';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { shortCode: slug },
    include: {
      client: true,
      user: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (invoice.status === 'SIGNED' || invoice.status === 'COMPLETED') {
    return NextResponse.json({ status: invoice.status });
  }

  if (invoice.status !== 'VIEWED') {
    return NextResponse.json(
      { error: 'Only viewed proposals can be signed' },
      { status: 400 }
    );
  }

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: 'SIGNED', updatedAt: new Date() },
    include: {
      client: true,
      user: true,
    },
  });

  try {
    await sendContractSignedEmail(updated, updated.client, updated.user);
  } catch (error) {
    console.error('Failed to send contract signed email', error);
  }

  return NextResponse.json({ status: updated.status });
}
