import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailFromToken } from '@/lib/auth-server';
import type { SplitResponse, SplitterConfig } from '@/lib/types';
import { PAGINATION_API_CONFIG } from '@/lib/constants';
import { validatePagination, validateId, ValidationError } from '@/lib/validation';
import { assertSupabaseResult, getAppSupabase } from '@/lib/supabase-server';

interface SplitResult {
  id: number;
  user_email: string;
  splitter_type: string;
  original_text: string;
  chunk_size: number | null;
  chunk_overlap: number | null;
  separator: string | null;
  separators: string[] | null;
  encoding_name: string | null;
  language: string | null;
  breakpoint_type: string | null;
  chunks: any[];
  chunk_count: number;
  processing_time: number | null;
  created_at: string;
}

// POST - Save split result
export async function POST(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { config, result, originalText } = body as {
      config: SplitterConfig;
      result: SplitResponse;
      originalText: string;
    };

    if (!config || !result || !originalText) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const { data: insertedResult, error } = await getAppSupabase()
      .from('split_results')
      .insert({
        user_email: userEmail,
        splitter_type: config.splitterType,
        original_text: originalText,
        chunk_size: config.chunkSize || null,
        chunk_overlap: config.chunkOverlap || null,
        separator: config.separator || null,
        separators: config.separators || null,
        encoding_name: config.encodingName || null,
        language: config.language || null,
        breakpoint_type: config.breakpointType || null,
        chunks: result.chunks,
        chunk_count: result.chunks.length,
        processing_time: result.statistics.processingTime || null,
      })
      .select('id')
      .single();
    assertSupabaseResult(error, 'Failed to save split result');

    return NextResponse.json({
      success: true,
      id: insertedResult?.id,
    });
  } catch (error) {
    console.error('Error saving split result:', error);
    return NextResponse.json(
      {
        error: 'Failed to save split result',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET - Retrieve split results
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
        .from('split_results')
        .select('*')
        .eq('id', id)
        .eq('user_email', userEmail)
        .maybeSingle();
      assertSupabaseResult(error, 'Failed to load split result');

      if (!data) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      return NextResponse.json(data as SplitResult);
    } else {
      // Get all results with pagination
      const { limit, offset } = validatePagination(rawLimit, rawOffset);

      const { data, error, count } = await getAppSupabase()
        .from('split_results')
        .select(
          'id, splitter_type, chunk_size, chunk_overlap, chunk_count, processing_time, created_at, original_text_preview',
          { count: 'exact' }
        )
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      assertSupabaseResult(error, 'Failed to list split results');

      return NextResponse.json({
        results: data || [],
        total: count || 0,
      });
    }
  } catch (error) {
    console.error('[API /split-results GET] Error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch split results',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete split result
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
      .from('split_results')
      .delete()
      .eq('id', id)
      .eq('user_email', userEmail);
    assertSupabaseResult(error, 'Failed to delete split result');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting split result:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to delete split result',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
