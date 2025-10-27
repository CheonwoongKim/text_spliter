import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserEmailFromToken } from '@/lib/auth-server';
import type { ParseResponse } from '@/lib/types';
import { validateParserType, validatePagination, validateId, ValidationError } from '@/lib/validation';
import { PAGINATION_API_CONFIG } from '@/lib/constants';

interface ParseResult {
  id: number;
  user_email: string;
  parser_type: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_storage_key: string | null;
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

    // Check if file_storage_key column exists, if not, add it
    try {
      const columns = await query<any[]>(
        "SHOW COLUMNS FROM parse_results LIKE 'file_storage_key'"
      );

      if (columns.length === 0) {
        console.log('[Parse Results] Adding file_storage_key column...');
        await query(
          `ALTER TABLE parse_results
           ADD COLUMN file_storage_key VARCHAR(500) DEFAULT NULL AFTER mime_type,
           ADD INDEX idx_storage_key (file_storage_key)`
        );
        console.log('[Parse Results] Column added successfully');
      }
    } catch (migrationError) {
      console.error('[Parse Results] Migration check failed:', migrationError);
      // Continue anyway - column might already exist
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

    const result = JSON.parse(resultStr);

    if (!result.metadata) {
      return NextResponse.json(
        { error: 'Invalid request data: missing metadata' },
        { status: 400 }
      );
    }

    // Determine file storage key
    let fileStorageKey: string | null = null;

    // If storage key is provided (file from Files storage), use it directly
    if (providedFileStorageKey) {
      fileStorageKey = providedFileStorageKey;
      console.log('[Parse Results] Using provided storage key:', fileStorageKey);
    }
    // Otherwise, upload file to Storage if provided
    else if (file) {
      try {
        const storageFormData = new FormData();
        storageFormData.append('file', file);

        const authHeader = request.headers.get('authorization');
        const STORAGE_API_BASE = process.env.STORAGE_API_BASE || 'http://ywstorage.synology.me:4000';
        const DEFAULT_BUCKET = process.env.STORAGE_DEFAULT_BUCKET || 'loan-agent-files';

        const uploadResponse = await fetch(
          `${STORAGE_API_BASE}/v1/storage/buckets/${DEFAULT_BUCKET}/upload`,
          {
            method: 'POST',
            headers: {
              'Authorization': authHeader || '',
            },
            body: storageFormData,
          }
        );

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          fileStorageKey = uploadData.key || file.name;
          console.log('[Parse Results] File uploaded to storage:', fileStorageKey);
        } else {
          console.error('[Parse Results] Failed to upload file to storage:', uploadResponse.status);
        }
      } catch (uploadError) {
        console.error('[Parse Results] Error uploading file to storage:', uploadError);
        // Continue without storage key - not critical
      }
    }

    // Insert into database
    const insertResult = await query(
      `INSERT INTO parse_results
       (user_email, parser_type, file_name, file_size, mime_type, file_storage_key,
        text_content, html_content, markdown_content, json_content, processing_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userEmail,
        parserType,
        result.metadata.fileName,
        result.metadata.fileSize,
        result.metadata.mimeType,
        fileStorageKey,
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
           LIMIT ${limit} OFFSET ${offset}`,
          [userEmail]
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

// PUT - Update parse result
export async function PUT(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, text_content, html_content, markdown_content, json_content } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const validatedId = validateId(String(id));

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (text_content !== undefined) {
      updates.push('text_content = ?');
      values.push(text_content);
    }
    if (html_content !== undefined) {
      updates.push('html_content = ?');
      values.push(html_content);
    }
    if (markdown_content !== undefined) {
      updates.push('markdown_content = ?');
      values.push(markdown_content);
    }
    if (json_content !== undefined) {
      updates.push('json_content = ?');
      values.push(json_content);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No content fields provided for update' },
        { status: 400 }
      );
    }

    // Add WHERE clause parameters
    values.push(validatedId, userEmail);

    await query(
      `UPDATE parse_results SET ${updates.join(', ')} WHERE id = ? AND user_email = ?`,
      values
    );

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
