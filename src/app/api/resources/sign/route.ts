import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

function buildSignedUrl(rawUrl: string, filename?: string) {
  if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary not configured');

  const url = new URL(rawUrl);
  if (!url.hostname.includes('res.cloudinary.com')) throw new Error('Not a Cloudinary URL');

  const parts = url.pathname.split('/').filter(Boolean);
  // Expect: /<cloud_name>/<resource_type>/<type>/<version>/public_id...
  const [, resourceType = 'raw', deliveryType = 'upload', maybeVersion, ...publicParts] = parts;
  const version = maybeVersion?.startsWith('v') ? maybeVersion.slice(1) : undefined;
  const publicId = publicParts.join('/');

  const flags = filename ? `attachment:${filename}` : undefined;

  return cloudinary.url(publicId, {
    resource_type: resourceType || 'raw',
    // Use authenticated delivery to avoid 401s on private/strict assets
    type: 'authenticated',
    version,
    sign_url: true,
    secure: true,
    flags,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');
  const filename = searchParams.get('filename') || undefined;

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const signed = buildSignedUrl(rawUrl, filename);
    return NextResponse.redirect(signed, { status: 302 });
  } catch (error) {
    console.error('Sign URL failed', error);
    return NextResponse.json({ error: 'Unable to sign url' }, { status: 400 });
  }
}
