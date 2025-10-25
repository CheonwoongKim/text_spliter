import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { SplitResponse, SplitterConfig } from '@/lib/types';

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
       (user_email, splitter_type, original_text, chunk_size, chunk_overlap,
        separator, separators, encoding_name, language, breakpoint_type,
        chunks, chunk_count, processing_time)
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
        result.processingTime || null,
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
    console.log('[API /split-results GET] Starting request...');

    // Ensure table exists
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS split_results (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_email VARCHAR(255) NOT NULL,
          splitter_type VARCHAR(100) NOT NULL,
          original_text MEDIUMTEXT NOT NULL,
          chunk_size INT,
          chunk_overlap INT,
          \`separator\` VARCHAR(255),
          separators JSON,
          encoding_name VARCHAR(50),
          \`language\` VARCHAR(50),
          breakpoint_type VARCHAR(50),
          chunks JSON NOT NULL,
          chunk_count INT NOT NULL,
          processing_time INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_email (user_email),
          INDEX idx_created_at (created_at),
          INDEX idx_splitter_type (splitter_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('[API /split-results GET] Table ensured');
    } catch (tableError) {
      console.error('[API /split-results GET] Error ensuring table:', tableError);
    }

    const userEmail = getUserEmailFromToken(request);
    console.log('[API /split-results GET] User email:', userEmail);

    if (!userEmail) {
      console.log('[API /split-results GET] No user email - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('[API /split-results GET] Params - id:', id, 'limit:', limit, 'offset:', offset);

    if (id) {
      // Get specific result
      console.log('[API /split-results GET] Fetching specific result:', id);
      const results = await query<SplitResult[]>(
        'SELECT * FROM split_results WHERE id = ? AND user_email = ?',
        [id, userEmail]
      );

      if (results.length === 0) {
        console.log('[API /split-results GET] Result not found');
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }

      console.log('[API /split-results GET] Returning specific result');
      return NextResponse.json(results[0]);
    } else {
      // Get all results with pagination
      console.log('[API /split-results GET] Fetching all results with pagination');

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

      console.log('[API /split-results GET] Found', results.length, 'results, total:', countResult[0]?.total);

      return NextResponse.json({
        results,
        total: countResult[0]?.total || 0,
      });
    }
  } catch (error) {
    console.error('[API /split-results GET] Error:', error);
    console.error('[API /split-results GET] Error stack:', error instanceof Error ? error.stack : 'No stack');
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await query(
      'DELETE FROM split_results WHERE id = ? AND user_email = ?',
      [id, userEmail]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting split result:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete split result',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
