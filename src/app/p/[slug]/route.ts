import { NextResponse, type NextRequest } from 'next/server';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.clientwave.app').replace(/\/$/, '');

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  const target = new URL(`/p/${encodeURIComponent(slug)}/view`, APP_URL);
  return NextResponse.redirect(target, 302);
}
