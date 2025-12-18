import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getReportingSummary, getInvoiceStatuses } from '@/lib/reporting';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const month = Number(url.searchParams.get('month')) || new Date().getMonth() + 1;
  const year = Number(url.searchParams.get('year')) || new Date().getFullYear();
  const status = url.searchParams.get('status') || 'ALL';
  const period = (url.searchParams.get('period') || 'monthly') as 'monthly' | 'yearly';

  const companyId = user.companyId ?? user.company?.id ?? null;
  const includeCompany = (user.role === 'OWNER' || user.role === 'ADMIN') && Boolean(companyId);
  const scope = { userId: user.id, companyId, includeCompany };

  const summary = await getReportingSummary(scope, { year, month, status, period });
  const statusOptions = await getInvoiceStatuses(scope);
  return NextResponse.json({ summary, statusOptions, filters: { year, month, status, period } });
}
