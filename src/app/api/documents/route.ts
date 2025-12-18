import { NextResponse } from 'next/server';

// Deprecated endpoint; documents feature removed. Respond with 410 Gone.
export async function GET() {
  return NextResponse.json({ error: 'Documents API removed' }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: 'Documents API removed' }, { status: 410 });
}
