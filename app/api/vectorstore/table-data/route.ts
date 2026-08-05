import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailFromToken } from '@/lib/auth-server';
import { getDecryptedApiKeyMap } from '@/lib/api-key-store';

export async function GET(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);
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
    const keys = await getDecryptedApiKeyMap(userEmail, ['supabaseUrl', 'supabaseKey']);

    if (!keys.supabaseUrl || !keys.supabaseKey) {
      return NextResponse.json({ error: 'Supabase credentials not found' }, { status: 404 });
    }

    const supabaseUrl = keys.supabaseUrl;
    const supabaseKey = keys.supabaseKey;

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
