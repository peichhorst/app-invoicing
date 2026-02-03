import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.RITE_KIT_API_KEY;

export async function GET(request: NextRequest) {
  if (!apiKey) {
    return NextResponse.json({ error: 'RiteKit API key not configured' }, { status: 500 });
  }

  const domain = request.nextUrl.searchParams.get('domain')?.trim();
  if (!domain) {
    return NextResponse.json({ error: 'Domain query parameter is required' }, { status: 400 });
  }

  const params = new URLSearchParams({
    domain,
    client_id: apiKey,
    size: request.nextUrl.searchParams.get('size') ?? '256',
    fallback: request.nextUrl.searchParams.get('fallback') ?? 'true',
    transparent: request.nextUrl.searchParams.get('transparent') ?? 'true',
  });
  const format = request.nextUrl.searchParams.get('format');
  if (format) {
    params.set('format', format);
  }

  const endpoint = `https://api.ritekit.com/v2/company-insights/logo?${params.toString()}`;

  try {
    const response = await fetch(endpoint, { headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) {
      const text = await response.text();
      console.error('RiteKit logo fetch failed', response.status, text);
      return NextResponse.json({ error: 'Failed to fetch logo' }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('RiteKit logo fetch error', error);
    return NextResponse.json({ error: 'Unable to call RiteKit' }, { status: 500 });
  }
}
