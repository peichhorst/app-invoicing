import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { clientVisibilityWhere } from '@/lib/client-scope';

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(_request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clients = await prisma.client.findMany({
    where: clientVisibilityWhere(user),
    orderBy: { companyName: 'asc' },
  });

  const header = [
    'Company',
    'Contact name',
    'Email',
    'Phone',
    'Address line 1',
    'Address line 2',
    'City',
    'State',
    'Postal code',
    'Country',
    'Notes',
    'Created at',
  ];

  const rows = clients.map((client) =>
    [
      client.companyName,
      client.contactName,
      client.email,
      client.phone,
      client.addressLine1,
      client.addressLine2,
      client.city,
      client.state,
      client.postalCode,
      client.country,
      client.notes,
      client.createdAt?.toISOString(),
    ]
      .map(escapeCsv)
      .join(',')
  );

  const csv = [header.map(escapeCsv).join(','), ...rows].join('\n');
  const filename = `clients-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
