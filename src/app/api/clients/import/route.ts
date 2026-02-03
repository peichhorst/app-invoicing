import crypto from 'crypto';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { describePlan } from '@/lib/plan';
import { CLIENT_CSV_FIELD_MAP, normalizeCsvHeader } from '@/lib/client-csv';
import { clientVisibilityWhere } from '@/lib/client-scope';

type ClientImportResult = {
  imported: number;
  skipped: number;
  warnings: string[];
};

type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

function parseCsv(text: string): ParsedCsv {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) {
    return { headers: [], rows: [] };
  }

  const headerLine = lines.shift()!;
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
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const companyId = user.companyId ?? user.company?.id ?? null;
  if (!companyId) {
    return NextResponse.json({ error: 'User is not linked to a company.' }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing CSV file' }, { status: 400 });
  }

  const rawText = await file.text();
  const text = rawText.trim();
  if (!text) {
    return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
  }

  const parsed = parseCsv(text);
  if (!parsed.headers.length) {
    return NextResponse.json({ error: 'CSV must include headers' }, { status: 400 });
  }

  if (!parsed.rows.length) {
    return NextResponse.json({ error: 'CSV must include at least one row' }, { status: 400 });
  }

  const payloads = parsed.rows.map((row) => {
    const entry: Record<string, string> = {};
    parsed.headers.forEach((header, index) => {
      const normalized = normalizeCsvHeader(header);
      const field = CLIENT_CSV_FIELD_MAP[normalized];
      if (!field) return;
      const value = row[index] ?? '';
      if (value.trim()) {
        entry[field] = value.trim();
      }
    });
    return entry;
  });

  const filledRows = payloads.filter((entry) => entry.companyName);
  if (!filledRows.length) {
    return NextResponse.json(
      { error: 'CSV must provide at least one company name to create a client' },
      { status: 400 }
    );
  }

  const plan = describePlan(user);
  const isPro = plan.effectiveTier === 'PRO';
  const currentCount = await prisma.client.count({
    where: { ...clientVisibilityWhere(user), archived: false },
  });
  const maxClients = isPro ? Number.MAX_SAFE_INTEGER : 3;
  const availableSlots = Math.max(maxClients - currentCount, 0);

  if (!isPro && availableSlots <= 0) {
    return NextResponse.json(
      { error: 'Free plan allows up to 3 clients. Upgrade to add more.' },
      { status: 402 }
    );
  }

  const importableRows = isPro ? filledRows : filledRows.slice(0, availableSlots);
  const skippedRows = filledRows.length - importableRows.length;

  const results: ClientImportResult = {
    imported: 0,
    skipped: skippedRows,
    warnings: [],
  };

  for (const [index, row] of importableRows.entries()) {
    if (!row.companyName) {
      results.warnings.push(`Row ${index + 2} skipped: missing Company`);
      continue;
    }

    try {
      const client = await prisma.client.create({
        data: {
          companyId,
          assignedToId: user.id,
          companyName: row.companyName,
          contactName: row.contactName ?? null,
          email: row.email ?? null,
          phone: row.phone ?? null,
          addressLine1: row.addressLine1 ?? null,
          addressLine2: row.addressLine2 ?? null,
          city: row.city ?? null,
          state: row.state ?? null,
          postalCode: row.postalCode ?? null,
          country: row.country ?? 'USA',
          notes: row.notes ?? null,
          isLead: false,
        },
      });
      results.imported += 1;

      try {
        await prisma.clientPortalUser.create({
          data: {
            clientId: client.id,
            email: client.email,
            portalToken: crypto.randomBytes(24).toString('hex'),
          },
        });
      } catch (portalError) {
        console.error('Failed to create client portal user (import)', portalError);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create client';
      results.warnings.push(`Row ${index + 2} failed: ${message}`);
    }
  }

  return NextResponse.json(results);
}
