import { NextRequest } from 'next/server';
import { getUserEmailFromToken, createUnauthorizedResponse } from '@/lib/auth-server';
import { STORAGE_API_BASE, DEFAULT_BUCKET } from '@/lib/storage-config';

export async function GET(request: NextRequest) {
  const email = getUserEmailFromToken(request);

  if (!email) {
    return createUnauthorizedResponse();
  }

  try {
    const authHeader = request.headers.get('authorization');
    const url = `${STORAGE_API_BASE}/v1/storage/buckets/${DEFAULT_BUCKET}/objects`;

    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader || '',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

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
