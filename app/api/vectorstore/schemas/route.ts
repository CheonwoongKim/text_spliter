import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailFromToken } from '@/lib/auth-server';
import { getDecryptedApiKeyMap } from '@/lib/api-key-store';

export async function GET(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Supabase credentials from database
    const keys = await getDecryptedApiKeyMap(userEmail, ['supabaseUrl', 'supabaseKey']);

    if (!keys.supabaseUrl || !keys.supabaseKey) {
      return NextResponse.json({ error: 'Supabase credentials not found. Please configure them in the Connect page.' }, { status: 404 });
    }

    const supabaseUrl = keys.supabaseUrl;
    const supabaseKey = keys.supabaseKey;

    // Use PostgREST API to get table information
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to connect to Supabase' }, { status: 500 });
    }

    const data = await response.json();

    // Parse OpenAPI spec to get table names
    const paths = data.paths || {};
    const tableNames: string[] = [];

    for (const path in paths) {
      // Extract table name from path (e.g., "/table_name" -> "table_name")
      const match = path.match(/^\/([^/]+)$/);
      if (match && match[1]) {
        tableNames.push(match[1]);
      }
    }

    // Get details for each table
    const tables = await Promise.all(
      tableNames.map(async (tableName) => {
        try {
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
          const rowCount = countHeader ? parseInt(countHeader.split('/')[1]) : 0;

          // Get column info from table definition
          const defResponse = await fetch(
            `${supabaseUrl}/rest/v1/${tableName}?limit=1`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
              },
            }
          );

          const sampleData = await defResponse.json();
          const columns = sampleData.length > 0
            ? Object.keys(sampleData[0]).map(col => ({
                name: col,
                type: typeof sampleData[0][col],
                nullable: true,
                isPrimaryKey: col === 'id',
              }))
            : [];

          return {
            name: tableName,
            schema: 'public',
            rowCount,
            columns,
          };
        } catch (error) {
          console.error(`Error fetching table ${tableName}:`, error);
          return null;
        }
      })
    );

    const validTables = tables.filter(t => t !== null);

    const schemas = [{
      name: 'public',
      tables: validTables,
    }];

    return NextResponse.json(schemas);
  } catch (error) {
    console.error('Error fetching schemas:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch schemas' },
      { status: 500 }
    );
  }
}
