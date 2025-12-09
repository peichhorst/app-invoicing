// src/app/api/cloudinary/upload/route.ts
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

export async function POST(request: Request) {
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'Cloudinary is not configured' },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const logo = formData.get('logo');
  if (!logo || !(logo instanceof File)) {
    return NextResponse.json({ error: 'Missing logo file' }, { status: 400 });
  }

  const buffer = Buffer.from(await logo.arrayBuffer());

  return new Promise<NextResponse>((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'app-invoicing/logos',
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload failed', error);
          resolve(NextResponse.json({ error: 'Upload failed' }, { status: 500 }));
        } else if (!result || !result.secure_url) {
          resolve(NextResponse.json({ error: 'Upload failed' }, { status: 500 }));
        } else {
          resolve(NextResponse.json({ secureUrl: result.secure_url, version: result.version }));
        }
      }
    );
    uploadStream.end(buffer);
  });
}
