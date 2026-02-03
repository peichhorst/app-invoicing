import React from 'react';
import { headers } from 'next/headers';

interface SourcePageProps {
  searchParams?: Promise<{ path?: string | string[] }>;
}

/**
 * Renders a simple source viewer for chat citations.
 */
const SourcePage = async ({ searchParams }: SourcePageProps) => {
  const resolvedParams = (await searchParams) ?? {};
  const rawPath = resolvedParams.path;
  const path = Array.isArray(rawPath) ? rawPath[0] : rawPath ?? '';

  if (!path) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow">
          <h1 className="text-xl font-semibold text-gray-900">Source Viewer</h1>
          <p className="mt-2 text-sm text-gray-600">No source was provided.</p>
        </div>
      </div>
    );
  }

  const headerList = await headers();
  const host = headerList.get('host') ?? 'localhost:3000';
  const protocol = headerList.get('x-forwarded-proto') ?? 'http';
  const baseUrl = `${protocol}://${host}`;

  const response = await fetch(
    `${baseUrl}/api/docs/source?path=${encodeURIComponent(path)}`,
    { cache: 'no-store' }
  );
  const payload = await response.json();
  const content = typeof payload?.content === 'string' ? payload.content : '';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl rounded-lg bg-white p-6 shadow">
        <h1 className="text-xl font-semibold text-gray-900">Source Viewer</h1>
        <p className="mt-1 text-sm text-gray-500">{path}</p>
        <pre className="mt-4 whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-4 text-xs text-gray-800">
          {content || 'Source content is unavailable.'}
        </pre>
      </div>
    </div>
  );
};

export default SourcePage;
