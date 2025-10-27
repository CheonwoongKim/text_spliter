import { NextRequest } from 'next/server';
import { getUserEmailFromToken, createUnauthorizedResponse } from '@/lib/auth-server';
import { STORAGE_API_BASE, DEFAULT_BUCKET } from '@/lib/storage-config';

export async function POST(request: NextRequest) {
  const email = getUserEmailFromToken(request);
  if (!email) {
    return createUnauthorizedResponse();
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'File is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Storage API] Uploading file:', file.name, 'size:', file.size, 'to bucket:', DEFAULT_BUCKET);

    const authHeader = request.headers.get('authorization');

    // Forward the file to the storage API
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    // Add key as query parameter (file path/name in the bucket)
    const key = file.name;
    const url = `${STORAGE_API_BASE}/v1/storage/buckets/${DEFAULT_BUCKET}/objects?key=${encodeURIComponent(key)}`;
    console.log('[Storage API] Upload URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || '',
      },
      body: uploadFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to upload file' }));
      return new Response(
        JSON.stringify({ error: errorData.error || 'Failed to upload file' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error uploading file to storage API:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to upload file to storage' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
