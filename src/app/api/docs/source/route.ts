import { NextResponse } from 'next/server';
import { readKnowledgeSource } from '@/services/knowledgeBase';

/**
 * Returns the raw contents of a whitelisted documentation/source file.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Path is required.' }, { status: 400 });
  }

  const content = await readKnowledgeSource(path);
  if (!content) {
    return NextResponse.json({ error: 'Source not found.' }, { status: 404 });
  }

  return NextResponse.json({ path, content }, { status: 200 });
}
