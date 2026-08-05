import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth-server';
import { assertUserDocumentKey, listUserDocuments } from '@/lib/document-storage';
import { DOCUMENTS_BUCKET } from '@/lib/storage-config';
import { assertSupabaseResult, getAppSupabase } from '@/lib/supabase-server';
import { ValidationError } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const documents = await listUserDocuments(getAppSupabase(), user.id);

    return NextResponse.json({
      files: documents.map((document) => ({
        id: document.id,
        filename: document.name,
        storage_key: document.key,
        file_size: document.size,
        content_type: document.contentType,
        uploaded_at: document.createdAt,
      })),
      total: documents.length,
      bucket: DOCUMENTS_BUCKET,
    });
  } catch (error) {
    console.error('[Supabase Storage] List failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch documents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromToken(request);
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const key = new URL(request.url).searchParams.get('filename');
    if (!key) {
      return NextResponse.json({ error: 'Document key is required' }, { status: 400 });
    }

    const safeKey = assertUserDocumentKey(key, user.id);
    const supabase = getAppSupabase();
    const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([safeKey]);
    if (error) {
      throw new Error(`Failed to delete Supabase Storage document: ${error.message}`);
    }

    const { error: referenceError } = await supabase
      .from('parse_results')
      .update({ file_storage_key: null })
      .eq('user_email', user.email)
      .eq('file_storage_key', safeKey);
    assertSupabaseResult(referenceError, 'Failed to clear deleted document references');

    return NextResponse.json({ success: true, key: safeKey });
  } catch (error) {
    console.error('[Supabase Storage] Delete failed:', error);
    return NextResponse.json(
      {
        error: error instanceof ValidationError ? error.message : 'Failed to delete document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: error instanceof ValidationError ? 400 : 500 }
    );
  }
}
