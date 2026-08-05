import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth-server';
import { assertUserDocumentKey } from '@/lib/document-storage';
import { DOCUMENTS_BUCKET } from '@/lib/storage-config';
import { getAppSupabase } from '@/lib/supabase-server';
import { ValidationError } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const key = new URL(request.url).searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'Document key is required' }, { status: 400 });
    }

    const safeKey = assertUserDocumentKey(key, user.id);
    const { data, error } = await getAppSupabase().storage
      .from(DOCUMENTS_BUCKET)
      .download(safeKey);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Document not found' },
        { status: 404 }
      );
    }

    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Content-Length': String(data.size),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[Supabase Storage] Preview failed:', error);
    return NextResponse.json(
      { error: error instanceof ValidationError ? error.message : 'Failed to load document preview' },
      { status: error instanceof ValidationError ? 400 : 500 }
    );
  }
}
