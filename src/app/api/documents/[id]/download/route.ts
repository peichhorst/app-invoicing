import { NextResponse } from 'next/server';

// Deprecated endpoint; documents feature removed. Respond with 410 Gone.
export async function GET() {
  return NextResponse.json({ error: 'Documents download removed' }, { status: 410 });
}
