import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth-server';
import { DOCUMENTS_BUCKET } from '@/lib/storage-config';
import { getAppSupabase } from '@/lib/supabase-server';

async function ensureDocumentsBucket() {
  const supabase = getAppSupabase();
  const { data, error } = await supabase.storage.getBucket(DOCUMENTS_BUCKET);
  if (data) return data;

  const { data: created, error: createError } = await supabase.storage.createBucket(
    DOCUMENTS_BUCKET,
    { public: false, fileSizeLimit: 50 * 1024 * 1024 }
  );

  if (createError) {
    throw new Error(createError.message || error?.message || 'Failed to create documents bucket');
  }

  return created;
}

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDocumentsBucket();
    return NextResponse.json({ bucket: DOCUMENTS_BUCKET, private: true, ready: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to prepare documents bucket' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    bucket: DOCUMENTS_BUCKET,
    private: true,
    prefix: `${user.id}/`,
  });
}
