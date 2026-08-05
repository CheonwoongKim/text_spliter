import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getUserEmailFromToken, getUserFromToken } from '@/lib/auth-server';
import { assertUserDocumentKey, uploadDocument } from '@/lib/document-storage';
import type { ParseResponse } from '@/lib/types';
import { assertSupabaseResult, getAppSupabase } from '@/lib/supabase-server';
import { validateParserType, validatePagination, validateId, ValidationError } from '@/lib/validation';
import { PAGINATION_API_CONFIG } from '@/lib/constants';

interface ParseResult {
  id: number;
  run_id: string | null;
  user_email: string;
  document_hash: string | null;
  parser_type: string;
  engine_id: string | null;
  parser_model: string | null;
  parser_version: string | null;
  run_status: string;
  run_config: any | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_storage_key: string | null;
  text_content: string | null;
  html_content: string | null;
  markdown_content: string | null;
  json_content: any | null;
  normalized_document: any | null;
  raw_response: any | null;
  processing_time: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// POST - Save parse result
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    const userEmail = user?.email;
    if (!user || !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse FormData to support file upload
    const formData = await request.formData();
    const parserTypeRaw = formData.get('parserType') as string;
    const resultStr = formData.get('result') as string;
    const file = formData.get('file') as File | null;
    const providedFileStorageKey = formData.get('fileStorageKey') as string | null;

    // Validate inputs
    const parserType = validateParserType(parserTypeRaw);

    if (!resultStr) {
      return NextResponse.json(
        { error: 'Invalid request data: missing result' },
        { status: 400 }
      );
    }

    const result = JSON.parse(resultStr) as ParseResponse;

    if (!result.metadata) {
      return NextResponse.json(
        { error: 'Invalid request data: missing metadata' },
        { status: 400 }
      );
    }

    const runId = result.run?.id || randomUUID();

    // Saving the same completed run twice is idempotent.
    const supabase = getAppSupabase();
    const { data: existingRun, error: existingRunError } = await supabase
      .from('parse_results')
      .select('id, file_storage_key')
      .eq('run_id', runId)
      .eq('user_email', userEmail)
      .maybeSingle();
    assertSupabaseResult(existingRunError, 'Failed to check existing parse run');

    if (existingRun) {
      return NextResponse.json({
        success: true,
        id: existingRun.id,
        fileStorageKey: existingRun.file_storage_key,
        duplicate: true,
      });
    }

    // Determine file storage key
    let fileStorageKey: string | null = null;

    // If storage key is provided (file from Files storage), use it directly
    if (providedFileStorageKey) {
      fileStorageKey = assertUserDocumentKey(providedFileStorageKey, user.id);
    }
    // Otherwise, store the source document in the user's Supabase Storage path.
    else if (file) {
      const uploaded = await uploadDocument(supabase, user.id, file);
      fileStorageKey = uploaded.key;
    }

    // Insert into database
    const { data: insertedRun, error: insertError } = await supabase
      .from('parse_results')
      .insert({
        run_id: runId,
        user_email: userEmail,
        document_hash: result.metadata.documentHash || null,
        parser_type: parserType,
        engine_id: result.run?.engineId || null,
        parser_model: result.run?.model || null,
        parser_version: result.run?.version || result.metadata.parserVersion || null,
        run_status: result.run?.status || 'succeeded',
        run_config: result.run?.config || null,
        file_name: result.metadata.fileName,
        file_size: result.metadata.fileSize,
        mime_type: result.metadata.mimeType,
        file_storage_key: fileStorageKey,
        text_content: result.text || null,
        html_content: result.html || null,
        markdown_content: result.markdown || null,
        json_content: result.json || null,
        normalized_document: result.document || null,
        raw_response: result.raw || null,
        processing_time: result.metadata.processingTime || null,
        started_at: result.run?.startedAt || null,
        completed_at: result.run?.completedAt || null,
      })
      .select('id')
      .single();
    assertSupabaseResult(insertError, 'Failed to save parse result');

    return NextResponse.json({
      success: true,
      id: insertedRun?.id,
      fileStorageKey,
    });
  } catch (error) {
    console.error('Error saving parse result:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to save parse result',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET - Retrieve parse results
export async function GET(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawId = searchParams.get('id');
    const rawLimit = searchParams.get('limit') || String(PAGINATION_API_CONFIG.DEFAULT_LIMIT);
    const rawOffset = searchParams.get('offset') || String(PAGINATION_API_CONFIG.DEFAULT_OFFSET);

    if (rawId) {
      // Get specific result
      const id = validateId(rawId);

      const { data, error } = await getAppSupabase()
        .from('parse_results')
        .select('*')
        .eq('id', id)
        .eq('user_email', userEmail)
        .maybeSingle();
      assertSupabaseResult(error, 'Failed to load parse result');

      if (!data) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      return NextResponse.json(data as ParseResult);
    } else {
      // Get all results with pagination
      const { limit, offset } = validatePagination(rawLimit, rawOffset);

      const { data, error, count } = await getAppSupabase()
        .from('parse_results')
        .select(
          'id, run_id, document_hash, parser_type, engine_id, parser_model, parser_version, run_status, file_name, file_size, mime_type, processing_time, started_at, completed_at, created_at',
          { count: 'exact' }
        )
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      assertSupabaseResult(error, 'Failed to list parse results');

      return NextResponse.json({
        results: (data || []) as ParseResult[],
        total: count || 0,
      });
    }
  } catch (error) {
    console.error('[API /parse-results GET] Error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch parse results',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT - Update parse result
export async function PUT(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, text_content, html_content, markdown_content, json_content } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const validatedId = validateId(String(id));

    const updates: Record<string, unknown> = {};

    if (text_content !== undefined) {
      updates.text_content = text_content;
    }
    if (html_content !== undefined) {
      updates.html_content = html_content;
    }
    if (markdown_content !== undefined) {
      updates.markdown_content = markdown_content;
    }
    if (json_content !== undefined) {
      updates.json_content = json_content;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No content fields provided for update' },
        { status: 400 }
      );
    }

    const { error } = await getAppSupabase()
      .from('parse_results')
      .update(updates)
      .eq('id', validatedId)
      .eq('user_email', userEmail);
    assertSupabaseResult(error, 'Failed to update parse result');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating parse result:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update parse result',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete parse result
export async function DELETE(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawId = searchParams.get('id');

    if (!rawId) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const id = validateId(rawId);

    const { error } = await getAppSupabase()
      .from('parse_results')
      .delete()
      .eq('id', id)
      .eq('user_email', userEmail);
    assertSupabaseResult(error, 'Failed to delete parse result');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting parse result:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to delete parse result',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
