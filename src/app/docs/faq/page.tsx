import React from 'react';
import { headers } from 'next/headers';

/**
 * FAQ page powered by the docs/faq.md source file.
 */
const FaqPage = async () => {
  const headerList = headers();
  const host = headerList.get('host') ?? 'localhost:3000';
  const protocol = headerList.get('x-forwarded-proto') ?? 'http';
  const baseUrl = `${protocol}://${host}`;

  const response = await fetch(`${baseUrl}/api/docs/source?path=docs/faq.md`, {
    cache: 'no-store',
  });
  const payload = await response.json();
  const content = typeof payload?.content === 'string' ? payload.content : '';

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
      <pre className="whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-4 text-xs text-gray-800">
        {content || 'FAQ content is unavailable.'}
      </pre>
    </div>
  );
};

export default FaqPage;
