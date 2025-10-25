import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { ParseResponse } from '@/lib/types';

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

// Get user email from JWT token
function getUserEmailFromToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.email || null;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

// POST - Save parse result
export async function POST(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { parserType, result } = body as {
      parserType: string;
      result: ParseResponse;
    };

    if (!parserType || !result || !result.metadata) {
      return NextResponse.json(
        { error: 'Invalid request data' },
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
    console.log('[API /parse-results GET] Starting request...');

    const userEmail = getUserEmailFromToken(request);
    console.log('[API /parse-results GET] User email:', userEmail);

    if (!userEmail) {
      console.log('[API /parse-results GET] No user email - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('[API /parse-results GET] Params - id:', id, 'limit:', limit, 'offset:', offset);

    if (id) {
      // Get specific result
      console.log('[API /parse-results GET] Fetching specific result:', id);
      const results = await query<ParseResult[]>(
        'SELECT * FROM parse_results WHERE id = ? AND user_email = ?',
        [id, userEmail]
      );

      if (results.length === 0) {
        console.log('[API /parse-results GET] Result not found');
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      console.log('[API /parse-results GET] Returning specific result');
      return NextResponse.json(results[0]);
    } else {
      // Get all results with pagination
      console.log('[API /parse-results GET] Fetching all results with pagination');

      const [results, countResult] = await Promise.all([
        query<ParseResult[]>(
          `SELECT id, parser_type, file_name, file_size, mime_type, processing_time, created_at
           FROM parse_results
           WHERE user_email = ?
           ORDER BY created_at DESC
           LIMIT ${limit} OFFSET ${offset}`,
          [userEmail]
        ),
        query<{ total: number }[]>(
          'SELECT COUNT(*) as total FROM parse_results WHERE user_email = ?',
          [userEmail]
        ),
      ]);

      console.log('[API /parse-results GET] Found', results.length, 'results, total:', countResult[0]?.total);

      return NextResponse.json({
        results,
        total: countResult[0]?.total || 0,
      });
    }
  } catch (error) {
    console.error('[API /parse-results GET] Error:', error);
    console.error('[API /parse-results GET] Error stack:', error instanceof Error ? error.stack : 'No stack');
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await query(
      'DELETE FROM parse_results WHERE id = ? AND user_email = ?',
      [id, userEmail]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting parse result:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete parse result',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
