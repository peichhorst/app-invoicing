import { NextRequest, NextResponse } from 'next/server';
import { enrichContact } from '@/lib/lead-enrichment';

export async function POST(req: NextRequest) {
  const { website, companyName } = await req.json();

  if (!process.env.HUNTER_API_KEY) {
    return NextResponse.json({ error: 'Missing HUNTER_API_KEY' }, { status: 500 });
  }

  const best = await enrichContact({ website, companyName });
  if (!best?.email) {
    return NextResponse.json(
      { error: 'Domain found, but no emails found on Hunter.' },
      { status: 404 }
    );
  }

  return NextResponse.json(best);
}
