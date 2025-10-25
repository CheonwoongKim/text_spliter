import { NextRequest } from 'next/server';
import { getUserEmailFromToken, createUnauthorizedResponse } from '@/lib/auth-server';

const STORAGE_API_BASE = process.env.STORAGE_API_BASE || 'http://ywstorage.synology.me:4000';
const DEFAULT_BUCKET = process.env.STORAGE_DEFAULT_BUCKET || 'loan-agent-files';

export async function GET(request: NextRequest) {
  const email = getUserEmailFromToken(request);
  console.log('[Storage API] User email:', email);

  if (!email) {
    console.log('[Storage API] No email found, returning unauthorized');
    return createUnauthorizedResponse();
  }

  console.log('[Storage API] Using default bucket:', DEFAULT_BUCKET);

  try {
    const authHeader = request.headers.get('authorization');
    const url = `${STORAGE_API_BASE}/v1/storage/buckets/${DEFAULT_BUCKET}/objects`;
    console.log('[Storage API] Requesting:', url);
    console.log('[Storage API] Auth header:', authHeader ? 'Token present' : 'No token');

    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader || '',
      },
    });

    console.log('[Storage API] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Storage API] Error response:', errorText);

      let errorData;
      let errorMessage = 'Failed to fetch files';

      try {
        errorData = JSON.parse(errorText);
        // S3 credential 에러를 사용자 친화적인 메시지로 변환
        if (errorData.error === 's3_error') {
          errorMessage = 'Storage service error. Please try again later.';
        } else {
          errorMessage = errorData.error || errorData.detail || errorData.message || 'Failed to fetch files';
        }
      } catch {
        errorMessage = errorText || 'Failed to fetch files';
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('[Storage API] Success, objects count:', data.objects?.length || 0);

    // Transform Storage API response to match frontend expectations
    const transformedData = {
      files: (data.objects || []).map((obj: any, index: number) => ({
        id: index + 1,
        filename: obj.key,
        file_size: obj.size,
        uploaded_at: obj.lastModified,
      })),
      total: data.count || 0,
      bucket: data.bucket,
    };

    return new Response(JSON.stringify(transformedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Storage API] Error fetching files from storage API:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch files from storage' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const email = getUserEmailFromToken(request);
  if (!email) {
    return createUnauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return new Response(
        JSON.stringify({ error: 'Filename is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Storage API] Deleting file:', filename, 'from bucket:', DEFAULT_BUCKET);

    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${STORAGE_API_BASE}/v1/storage/buckets/${DEFAULT_BUCKET}/objects/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader || '',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete file' }));
      return new Response(
        JSON.stringify({ error: errorData.error || 'Failed to delete file' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json().catch(() => ({ success: true }));
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting file from storage API:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete file from storage' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
