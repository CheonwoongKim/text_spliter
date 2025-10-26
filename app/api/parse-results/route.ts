import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserEmailFromToken } from '@/lib/auth-server';
import type { ParseResponse } from '@/lib/types';
import { validateParserType, validatePagination, validateId, ValidationError } from '@/lib/validation';

interface ParseResult {
  id: number;
  user_email: string;
  parser_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  text_content: string | null;
  html_content: string | null;
  markdown_content: string | null;
  json_content: any | null;
  processing_time: number | null;
  created_at: string;
}

// POST - Save parse result
export async function POST(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { parserType: rawParserType, result } = body;

    // Validate inputs
    const parserType = validateParserType(rawParserType);

    if (!result || !result.metadata) {
      return NextResponse.json(
        { error: 'Invalid request data: missing result or metadata' },
        { status: 400 }
      );
    }

    // Insert into database
    const insertResult = await query(
      `INSERT INTO parse_results
       (user_email, parser_type, file_name, file_size, mime_type,
        text_content, html_content, markdown_content, json_content, processing_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userEmail,
        parserType,
        result.metadata.fileName,
        result.metadata.fileSize,
        result.metadata.mimeType,
        result.text || null,
        result.html || null,
        result.markdown || null,
        result.json ? JSON.stringify(result.json) : null,
        result.metadata.processingTime || null,
      ]
    );

    return NextResponse.json({
      success: true,
      id: (insertResult as any).insertId,
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
    const userEmail = getUserEmailFromToken(request);

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawId = searchParams.get('id');
    const rawLimit = searchParams.get('limit') || '50';
    const rawOffset = searchParams.get('offset') || '0';

    if (rawId) {
      // Get specific result
      const id = validateId(rawId);

      const results = await query<ParseResult[]>(
        'SELECT * FROM parse_results WHERE id = ? AND user_email = ?',
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
        query<ParseResult[]>(
          `SELECT id, parser_type, file_name, file_size, mime_type, processing_time, created_at
           FROM parse_results
           WHERE user_email = ?
           ORDER BY created_at DESC
           LIMIT ? OFFSET ?`,
          [userEmail, limit, offset]
        ),
        query<{ total: number }[]>(
          'SELECT COUNT(*) as total FROM parse_results WHERE user_email = ?',
          [userEmail]
        ),
      ]);

      return NextResponse.json({
        results,
        total: countResult[0]?.total || 0,
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

// DELETE - Delete parse result
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
      'DELETE FROM parse_results WHERE id = ? AND user_email = ?',
      [id, userEmail]
    );

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
