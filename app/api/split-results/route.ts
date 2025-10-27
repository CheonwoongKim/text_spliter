import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserEmailFromToken } from '@/lib/auth-server';
import type { SplitResponse, SplitterConfig } from '@/lib/types';
import { PAGINATION_API_CONFIG } from '@/lib/constants';
import { validatePagination, validateId, ValidationError } from '@/lib/validation';

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
    const userEmail = getUserEmailFromToken(request);
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

    // Insert into database
    const insertResult = await query(
      `INSERT INTO split_results
       (\`user_email\`, \`splitter_type\`, \`original_text\`, \`chunk_size\`, \`chunk_overlap\`,
        \`separator\`, \`separators\`, \`encoding_name\`, \`language\`, \`breakpoint_type\`,
        \`chunks\`, \`chunk_count\`, \`processing_time\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userEmail,
        config.splitterType,
        originalText,
        config.chunkSize || null,
        config.chunkOverlap || null,
        config.separator || null,
        config.separators ? JSON.stringify(config.separators) : null,
        config.encodingName || null,
        config.language || null,
        config.breakpointType || null,
        JSON.stringify(result.chunks),
        result.chunks.length,
        result.statistics.processingTime || null,
      ]
    );

    return NextResponse.json({
      success: true,
      id: (insertResult as any).insertId,
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
    const userEmail = getUserEmailFromToken(request);

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

      const results = await query<SplitResult[]>(
        'SELECT * FROM split_results WHERE id = ? AND user_email = ?',
        [id, userEmail]
      );

      if (results.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      return NextResponse.json(results[0]);
    } else {
      // Get all results with pagination
      const { limit, offset } = validatePagination(rawLimit, rawOffset);

      const [results, countResult] = await Promise.all([
        query<SplitResult[]>(
          `SELECT id, splitter_type, chunk_size, chunk_overlap, chunk_count, processing_time, created_at,
                  LEFT(original_text, 100) as original_text_preview
           FROM split_results
           WHERE user_email = ?
           ORDER BY created_at DESC
           LIMIT ${limit} OFFSET ${offset}`,
          [userEmail]
        ),
        query<{ total: number }[]>(
          'SELECT COUNT(*) as total FROM split_results WHERE user_email = ?',
          [userEmail]
        ),
      ]);

      return NextResponse.json({
        results,
        total: countResult[0]?.total || 0,
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
    const userEmail = getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawId = searchParams.get('id');

    if (!rawId) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const id = validateId(rawId);

    await query(
      'DELETE FROM split_results WHERE id = ? AND user_email = ?',
      [id, userEmail]
    );

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
