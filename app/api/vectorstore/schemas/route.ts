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

    // Get Supabase credentials from database
    const [urlResult, keyResult] = await Promise.all([
      query<ApiKey[]>('SELECT encrypted_key FROM user_api_keys WHERE user_email = ? AND key_name = ?', [userEmail, 'supabaseUrl']),
      query<ApiKey[]>('SELECT encrypted_key FROM user_api_keys WHERE user_email = ? AND key_name = ?', [userEmail, 'supabaseKey']),
    ]);

    if (!urlResult.length || !keyResult.length) {
      return NextResponse.json({ error: 'Supabase credentials not found. Please configure them in the Connect page.' }, { status: 404 });
    }

    const supabaseUrl = decrypt(urlResult[0].encrypted_key);
    const supabaseKey = decrypt(keyResult[0].encrypted_key);

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
