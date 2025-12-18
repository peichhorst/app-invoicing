import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // Extract domain from URL
    let domain = url.trim();
    domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '').split('/')[0];

    if (!domain) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Try multiple logo sources
    const logoSources = [
      `https://logo.clearbit.com/${domain}`,
      `https://img.logo.dev/${domain}?token=pk_X-HfjJ7ER0StzXcem-bQ6Q`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
    ];

    // Try each source until one works
    for (const logoUrl of logoSources) {
      try {
        const response = await fetch(logoUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          
          // Check if it's actually an image
          if (contentType && contentType.startsWith('image/')) {
            return NextResponse.json({ logoUrl, source: logoUrl });
          }
        }
      } catch (err) {
        // Try next source
        continue;
      }
    }

    return NextResponse.json({ error: 'No logo found' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching logo:', error);
    return NextResponse.json({ error: 'Failed to fetch logo' }, { status: 500 });
  }
}
