import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { buildComplianceReport, resolveSince } from '@/lib/compliance-report';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(request.url);
  const period = url.searchParams.get('period') ?? undefined;
  const since = resolveSince(period);
  const report = await buildComplianceReport(user.companyId, since);
  return NextResponse.json(report);
}
