import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getReportingSummary, getInvoiceStatuses, getPerUserTotals, getPerClientTotals } from '@/lib/reporting';

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
  const includeCompanyParam = url.searchParams.get('includeCompany');
  const byUser = url.searchParams.get('byUser') === 'true' || url.searchParams.get('byUser') === '1';
  const byClient = url.searchParams.get('byClient') === 'true' || url.searchParams.get('byClient') === '1';
  const canIncludeCompany = (user.role === 'OWNER' || user.role === 'ADMIN') && Boolean(companyId);
  const includeCompany =
    includeCompanyParam === null
      ? canIncludeCompany
      : canIncludeCompany && (includeCompanyParam === 'true' || includeCompanyParam === '1');
  const scope = { userId: user.id, companyId, includeCompany };

  const summary = await getReportingSummary(scope, { year, month, status, period });
  const statusOptions = await getInvoiceStatuses(scope);
  const byUserTotals = includeCompany && byUser ? await getPerUserTotals(scope, { year, month, status, period }) : null;
  const byClientTotals = byClient ? await getPerClientTotals(scope, { year, month, status, period }) : null;
  return NextResponse.json({
    summary,
    statusOptions,
    filters: { year, month, status, period },
    byUser: byUserTotals,
    byClient: byClientTotals,
    debugUser: user, // <-- Add user object for debug
    debugScope: scope // <-- Add scope for debug
  });
}
