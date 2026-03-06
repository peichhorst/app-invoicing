import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { LEAD_CSV_FIELD_MAP, normalizeLeadCsvHeader } from '@/lib/lead-csv';

function parseCsv(text: string) {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => line.length > 0);

  if (!lines.length) return { headers: [], rows: [] };
  const headerLine = lines.shift();
  if (!headerLine) return { headers: [], rows: [] };
  const headers = parseCsvLine(headerLine);
  const rows = lines.map(parseCsvLine);
  return { headers, rows };
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
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

  const normalizedHeaders = headers.map(normalizeLeadCsvHeader);
  const fieldIndexes = normalizedHeaders.map((h) => LEAD_CSV_FIELD_MAP[h] ?? null);
  const hasLeadIdentityHeader = normalizedHeaders.includes('name') || normalizedHeaders.includes('email');
  if (!hasLeadIdentityHeader) {
    return NextResponse.json(
      { error: 'Lead CSV must include at least a Name or Email column.' },
      { status: 400 }
    );
  }

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
        assignedToId: user.id,
        status: lead.status || 'new',
        company: { connect: { id: user.companyId } },
      },
    });
    imported++;
  }

  return NextResponse.json({ imported, skipped, warnings });
}
