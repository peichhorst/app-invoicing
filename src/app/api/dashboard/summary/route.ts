import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  if (!companyId) {
    return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user || (user.companyId !== companyId && user.company?.id !== companyId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const [leadsCount, clientsCount, teamCount, proposalsCount, contractsCount, invoicesCount, recurringCount] = await Promise.all([
    prisma.lead.count({ where: { companyId, archived: false } }),
    prisma.client.count({ where: { companyId, archived: false } }),
    prisma.user.count({ where: { companyId } }),
    prisma.proposal.count({ where: { client: { companyId } } }),
    prisma.contract.count({ where: { client: { companyId } } }),
    prisma.invoice.count({ where: { client: { companyId } } }),
    prisma.recurringInvoice.count({ where: { client: { companyId } } }),
  ]);
  return NextResponse.json({
    leadsCount,
    clientsCount,
    teamCount,
    proposalsCount,
    contractsCount,
    invoicesCount,
    recurringCount,
  });
}
