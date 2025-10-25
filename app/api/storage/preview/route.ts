import { NextRequest } from 'next/server';
import { getUserEmailFromToken, createUnauthorizedResponse } from '@/lib/auth-server';

const STORAGE_API_BASE = process.env.STORAGE_API_BASE || 'http://ywstorage.synology.me:4000';
const DEFAULT_BUCKET = process.env.STORAGE_DEFAULT_BUCKET || 'loan-agent-files';

export async function GET(request: NextRequest) {
  const email = getUserEmailFromToken(request);

  if (!email) {
    return createUnauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return new Response(
        JSON.stringify({ error: 'File key is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = request.headers.get('authorization');
    // Use mode=view to open file in browser (for PDF, images)
    const url = `${STORAGE_API_BASE}/v1/storage/buckets/${DEFAULT_BUCKET}/preview/${encodeURIComponent(key)}?mode=view`;

    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader || '',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Storage Preview API] Error response:', errorText);

      let errorMessage = 'Failed to fetch preview';
      let errorData: any = {};

      try {
        errorData = JSON.parse(errorText);

        // Handle specific error cases
        if (errorData.error === 'file_too_large') {
          errorMessage = `File is too large for preview (${(errorData.fileSize / 1024 / 1024).toFixed(2)}MB). Maximum size is ${(errorData.maxSize / 1024 / 1024).toFixed(0)}MB.`;
        } else {
          errorMessage = errorData.message || errorData.error || 'Failed to fetch preview';
        }
      } catch {
        errorMessage = errorText || 'Failed to fetch preview';
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Forward the response with the same content type
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const blob = await response.blob();

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    console.error('[Storage Preview API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch preview' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
