import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth-server';
import { uploadDocument } from '@/lib/document-storage';
import { DOCUMENTS_BUCKET } from '@/lib/storage-config';
import { getAppSupabase } from '@/lib/supabase-server';
import { ValidationError } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const uploaded = await uploadDocument(getAppSupabase(), user.id, file);

    return NextResponse.json({
      success: true,
      bucket: DOCUMENTS_BUCKET,
      key: uploaded.key,
      filename: file.name,
      size: uploaded.size,
      contentType: uploaded.contentType,
      sha256: uploaded.hash,
    });
  } catch (error) {
    console.error('[Supabase Storage] Upload failed:', error);
    return NextResponse.json(
      {
        error: error instanceof ValidationError ? error.message : 'Failed to upload document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: error instanceof ValidationError ? 400 : 500 }
    );
  }
}
