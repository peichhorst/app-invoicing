import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(_request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leads = await prisma.lead.findMany({
    where: { companyId: user.companyId || '', archived: false },
    orderBy: { createdAt: 'desc' },
  });

  const header = [
    'Name',
    'Company',
    'Email',
    'Phone',
    'Status',
    'Source',
    'Notes',
    'Created at',
    'Updated at',
    'Converted to Client',
  ];

  const rows = leads.map((lead: any) =>
    [
      lead.name,
      lead.companyName,
      lead.email,
      lead.phone,
      lead.status,
      lead.source,
      lead.notes,
      lead.createdAt?.toISOString(),
      lead.updatedAt?.toISOString(),
      lead.clientId ? 'Yes' : 'No',
    ]
      .map(escapeCsv)
      .join(',')
  );

  const csv = [header.map(escapeCsv).join(','), ...rows].join('\n');
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=${filename}`,
    },
  });
}
