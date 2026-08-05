import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailFromToken } from '@/lib/auth-server';
import { assertSupabaseResult, getAppSupabase } from '@/lib/supabase-server';

// GET - Check whether the Supabase application schema is available.
export async function GET(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getAppSupabase();
    const tables = ['user_api_keys', 'parse_results', 'split_results'];
    const checks = await Promise.all(tables.map(async (table) => {
      const { error } = await supabase.from(table).select('id').limit(0);
      assertSupabaseResult(error, `Supabase table ${table} is unavailable`);
      return table;
    }));

    return NextResponse.json({
      message: 'Supabase application database is ready',
      migrated: false,
      ready: true,
      tables: checks,
    });
  } catch (error) {
    console.error('Error during migration:', error);
    return NextResponse.json(
      {
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
