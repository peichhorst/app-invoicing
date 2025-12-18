import { NextResponse } from 'next/server';
import { getToolsSnapshot } from '@/lib/toolsSnapshot';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const city = (body.city ?? '').trim();
    const state = (body.state ?? '').trim();
    const zip = (body.zip ?? '').trim();

    if (!city || !state) {
      return NextResponse.json(
        { error: 'City and state are required to build the snapshot.' },
        { status: 400 },
      );
    }

    const snapshot = await getToolsSnapshot({
      city,
      state,
      zip: zip || undefined,
    });

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error('[Tools API]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
