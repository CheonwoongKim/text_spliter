import { NextRequest } from 'next/server';
import { getUserEmailFromToken, createUnauthorizedResponse } from '@/lib/auth-server';

const STORAGE_API_BASE = process.env.STORAGE_API_BASE || 'http://ywstorage.synology.me:4000';
const DEFAULT_BUCKET = process.env.STORAGE_DEFAULT_BUCKET || 'loan-agent-files';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const email = getUserEmailFromToken(request);
  if (!email) {
    return createUnauthorizedResponse();
  }

  try {
    const filename = params.filename;

    if (!filename) {
      return new Response(
        JSON.stringify({ error: 'Filename is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Storage API] Downloading file:', filename, 'from bucket:', DEFAULT_BUCKET);

    const authHeader = request.headers.get('authorization');

    const response = await fetch(
      `${STORAGE_API_BASE}/v1/storage/${DEFAULT_BUCKET}/download?filename=${encodeURIComponent(filename)}`,
      {
        headers: {
          'Authorization': authHeader || '',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to download file' }));
      return new Response(
        JSON.stringify({ error: errorData.error || 'Failed to download file' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the file blob and content type
    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition') || `attachment; filename="${filename}"`;

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      },
    });
  } catch (error) {
    console.error('Error downloading file from storage API:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to download file from storage' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
