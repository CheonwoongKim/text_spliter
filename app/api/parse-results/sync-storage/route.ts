import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth-server';
import { fileNameFromDocumentKey, listUserDocuments } from '@/lib/document-storage';
import { assertSupabaseResult, getAppSupabase } from '@/lib/supabase-server';

interface ParseResult {
  id: number;
  file_name: string;
  file_storage_key: string | null;
}

// Backfill source-document references for results created before Supabase Storage was enabled.
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAppSupabase();
    const { data, error } = await supabase
      .from('parse_results')
      .select('id, file_name, file_storage_key')
      .eq('user_email', user.email)
      .is('file_storage_key', null);
    assertSupabaseResult(error, 'Failed to load parse results for storage sync');
    const parseResults = (data || []) as ParseResult[];

    if (parseResults.length === 0) {
      return NextResponse.json({ message: 'No parse results to sync', updated: 0, total: 0 });
    }

    const documents = await listUserDocuments(supabase, user.id);
    const keysByName = new Map<string, string>();
    for (const document of documents) {
      keysByName.set(fileNameFromDocumentKey(document.key), document.key);
    }

    const updates = parseResults.flatMap((result) => {
      const fileName = result.file_name.split('/').pop() || result.file_name;
      const key = keysByName.get(fileName);
      return key ? [{ id: result.id, key, fileName: result.file_name }] : [];
    });

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('parse_results')
        .update({ file_storage_key: update.key })
        .eq('id', update.id)
        .eq('user_email', user.email);
      assertSupabaseResult(updateError, `Failed to sync parse result ${update.id}`);
    }

    return NextResponse.json({
      message: `Successfully synced ${updates.length} parse results`,
      updated: updates.length,
      total: parseResults.length,
      matches: updates,
    });
  } catch (error) {
    console.error('Error syncing parse results with Supabase Storage:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync parse results',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
