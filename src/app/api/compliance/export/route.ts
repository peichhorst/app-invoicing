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

  const csvRows = ['Title,Acknowledged,Total,Percentage'];
  report.perResource.forEach((entry) => {
    csvRows.push(
      `"${entry.title.replace(/"/g, '""')}",${entry.acknowledged},${entry.total},${entry.total ? Math.round((entry.acknowledged / entry.total) * 100) : 0}`
    );
  });

  const csvContent = csvRows.join('\n');
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="compliance-report.csv"',
    },
  });
}
