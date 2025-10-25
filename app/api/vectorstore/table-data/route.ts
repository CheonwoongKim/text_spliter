import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/encryption';
import { query } from '@/lib/db';

interface ApiKey {
  encrypted_key: string;
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

export async function GET(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');
    const schema = searchParams.get('schema') || 'public';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!tableName) {
      return NextResponse.json({ error: 'Table name is required' }, { status: 400 });
    }

    // Get Supabase credentials from database
    const [urlResult, keyResult] = await Promise.all([
      query<ApiKey[]>('SELECT encrypted_key FROM user_api_keys WHERE user_email = ? AND key_name = ?', [userEmail, 'supabaseUrl']),
      query<ApiKey[]>('SELECT encrypted_key FROM user_api_keys WHERE user_email = ? AND key_name = ?', [userEmail, 'supabaseKey']),
    ]);

    if (!urlResult.length || !keyResult.length) {
      return NextResponse.json({ error: 'Supabase credentials not found' }, { status: 404 });
    }

    const supabaseUrl = decrypt(urlResult[0].encrypted_key);
    const supabaseKey = decrypt(keyResult[0].encrypted_key);

    // Get row count
    const countResponse = await fetch(
      `${supabaseUrl}/rest/v1/${tableName}?select=*&limit=0`,
      {
        method: 'HEAD',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'count=exact',
        },
      }
    );

    const countHeader = countResponse.headers.get('content-range');
    const totalCount = countHeader ? parseInt(countHeader.split('/')[1]) : 0;

    // Get table data with pagination
    const dataResponse = await fetch(
      `${supabaseUrl}/rest/v1/${tableName}?select=*&limit=${limit}&offset=${offset}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!dataResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch table data' }, { status: 500 });
    }

    const rows = await dataResponse.json();

    // Get column information from first row
    const columns = rows.length > 0
      ? Object.keys(rows[0]).map(col => ({
          name: col,
          type: typeof rows[0][col],
          nullable: true,
          isPrimaryKey: col === 'id',
        }))
      : [];

    return NextResponse.json({
      rows,
      columns,
      totalCount,
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch table data' },
      { status: 500 }
    );
  }
}
