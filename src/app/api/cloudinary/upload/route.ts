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
  const logoFile = formData.get('logo');
  const signatureFile = formData.get('signature');
  const genericFile = formData.get('file');
  const file =
    logoFile instanceof File
      ? logoFile
      : signatureFile instanceof File
      ? signatureFile
      : genericFile instanceof File
      ? genericFile
      : null;
  if (!file) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name || '';
  const mime = file.type || '';
  const isDoc = mime.startsWith('application/') || /\.(pdf|docx?|pptx?|xlsx?|csv|txt)$/i.test(filename);

  return new Promise<NextResponse>((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: logoFile instanceof File
          ? 'app-invoicing/logos'
          : signatureFile instanceof File
          ? 'app-invoicing/signatures'
          : 'app-invoicing/documents',
        resource_type: isDoc ? 'raw' : 'auto',
        // For documents, keep the full filename (with extension) as the public_id so we can sign with attachment names
        ...(isDoc && filename ? { public_id: filename } : {}),
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload failed', error);
          resolve(NextResponse.json({ error: 'Upload failed' }, { status: 500 }));
        } else if (!result || !result.secure_url) {
          resolve(NextResponse.json({ error: 'Upload failed' }, { status: 500 }));
        } else {
          // Return the secure URL directly; filename with extension is in the public_id
          resolve(NextResponse.json({ secureUrl: result.secure_url, version: result.version }));
        }
      }
    );
    uploadStream.end(buffer);
  });
}
