/**
 * Utility functions for Cloudinary integration
 */

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  type: string;
  format: string;
  version: number;
  signature: string;
  width?: number;
  height?: number;
  created_at: string;
}

/**
 * Uploads a file buffer to Cloudinary and returns the result
 */
export async function uploadToCloudinary(
  buffer: Buffer, 
  publicId: string, 
  resourceType: 'raw' | 'image' | 'video' = 'raw',
  folder?: string
): Promise<CloudinaryUploadResult> {
  // In a real implementation, this would upload to Cloudinary
  // For now, we'll simulate this by returning a mock result
  
  // Real implementation would be:
  /*
  const formData = new FormData();
  formData.append('file', buffer);
  formData.append('public_id', publicId);
  formData.append('resource_type', resourceType);
  if (folder) {
    formData.append('folder', folder);
  }
  formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Cloudinary upload failed: ${error.error?.message || 'Unknown error'}`);
  }
  
  return await response.json();
  */
  
  // Mock implementation for demonstration purposes
  console.warn('Cloudinary upload simulated - in production, this would upload to Cloudinary');
  return {
    secure_url: `https://mock-cloudinary-url.com/${publicId}.${resourceType === 'image' ? 'jpg' : 'pdf'}`,
    public_id: publicId,
    resource_type: resourceType,
    type: 'upload',
    format: resourceType === 'image' ? 'jpg' : 'pdf',
    version: Date.now(),
    signature: 'mock-signature',
    created_at: new Date().toISOString(),
  };
}

/**
 * Generates a public ID for Cloudinary based on document type and ID
 */
export function generatePublicId(documentType: 'invoice' | 'proposal' | 'contract', documentId: string, suffix?: string): string {
  const timestamp = Date.now();
  const baseId = `${documentType}/${documentId}`;
  return suffix ? `${baseId}_${suffix}_${timestamp}` : `${baseId}_${timestamp}`;
}

/**
 * Checks if Cloudinary is properly configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}