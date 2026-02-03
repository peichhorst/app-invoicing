import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { LEAD_CSV_FIELD_MAP, normalizeLeadCsvHeader } from '@/lib/lead-csv';

function parseCsv(text: string) {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) return { headers: [], rows: [] };
  const headerLine = lines.shift();
  if (!headerLine) return { headers: [], rows: [] };
  const headers = headerLine.split(',').map((h) => h.replace(/^"|"$/g, '').trim());
  const rows = lines.map((line) => line.split(',').map((v) => v.replace(/^"|"$/g, '').trim()));
  return { headers, rows };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !user.companyId) {
    return NextResponse.json({ error: 'Unauthorized or missing company' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }
  const text = await file.text();
  const { headers, rows } = parseCsv(text);
  if (!headers.length) {
    return NextResponse.json({ error: 'CSV missing headers' }, { status: 400 });
  }

  const mappedHeaders = headers.map(normalizeLeadCsvHeader);
  const fieldIndexes = mappedHeaders.map((h) => LEAD_CSV_FIELD_MAP[h] ?? null);

  let imported = 0;
  let skipped = 0;
  const warnings: string[] = [];

  for (const row of rows) {
    const lead: Record<string, any> = {};
    fieldIndexes.forEach((field, i) => {
      if (field) lead[field] = row[i];
    });
    if (!lead.name && !lead.email) {
      skipped++;
      warnings.push('Skipped row with no name or email');
      continue;
    }
    await prisma.lead.create({
      data: {
        ...lead,
        company: { connect: { id: user.companyId } },
      },
    });
    imported++;
  }

  return NextResponse.json({ imported, skipped, warnings });
}
