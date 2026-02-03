import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { domain } = await req.json();
  const apiKey = process.env.ABSTRACTAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing ABSTRACTAPI_API_KEY' }, { status: 500 });
  }
  if (!domain) {
    return NextResponse.json({ error: 'Missing domain' }, { status: 400 });
  }

  try {
    const url = `https://companyenrichment.abstractapi.com/v1/?api_key=${encodeURIComponent(
      apiKey
    )}&domain=${encodeURIComponent(domain)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.error('Abstract API error', text);
      return NextResponse.json({ error: 'Failed to fetch company data' }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching company meta', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch company meta' },
      { status: 500 }
    );
  }
}
