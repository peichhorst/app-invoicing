import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { enrichContact } from '@/lib/lead-enrichment';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, companyId: true },
  });

  if (!lead || lead.companyId !== user.companyId) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const { companyName, website } = await request.json();
  const best = await enrichContact({ companyName, website });
  if (!best || (!best.email && !best.phone)) {
    return NextResponse.json(
      { error: 'Unable to enrich lead from the provided information.' },
      { status: 404 }
    );
  }

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      email: best.email ?? undefined,
      phone: best.phone ?? undefined,
    },
  });

  return NextResponse.json({ ...best, lead: updated });
}
