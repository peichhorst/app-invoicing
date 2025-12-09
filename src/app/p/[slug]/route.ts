import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { shortCode: slug },
    select: { id: true, userId: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clientwave.app';
  const target = new URL(`/payment?seller=${invoice.userId}&invoice=${invoice.id}`, appBase);
  return NextResponse.redirect(target, 302);
}
