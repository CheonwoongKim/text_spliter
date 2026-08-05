import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth-server';
import { assertUserDocumentKey, fileNameFromDocumentKey } from '@/lib/document-storage';
import { DOCUMENTS_BUCKET } from '@/lib/storage-config';
import { getAppSupabase } from '@/lib/supabase-server';
import { ValidationError } from '@/lib/validation';

function contentDispositionFileName(name: string): string {
  return name.replace(/["\r\n]/g, '_');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const user = await getUserFromToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { filename } = await params;
    const safeKey = assertUserDocumentKey(filename, user.id);
    const { data, error } = await getAppSupabase().storage
      .from(DOCUMENTS_BUCKET)
      .download(safeKey);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Document not found' },
        { status: 404 }
      );
    }

    const originalName = contentDispositionFileName(fileNameFromDocumentKey(safeKey));
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Content-Length': String(data.size),
        'Content-Disposition': `attachment; filename="${originalName}"; filename*=UTF-8''${encodeURIComponent(originalName)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[Supabase Storage] Download failed:', error);
    return NextResponse.json(
      { error: error instanceof ValidationError ? error.message : 'Failed to download document' },
      { status: error instanceof ValidationError ? 400 : 500 }
    );
  }
}
