import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserEmailFromToken } from '@/lib/auth-server';

// GET - Check if migration is needed and execute
export async function GET(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if column exists
    const columns = await query<any[]>(
      "SHOW COLUMNS FROM parse_results LIKE 'file_storage_key'"
    );

    if (columns.length === 0) {
      // Column doesn't exist, run migration
      console.log('[Migration] Adding file_storage_key column...');

      await query(
        `ALTER TABLE parse_results
         ADD COLUMN file_storage_key VARCHAR(500) DEFAULT NULL AFTER mime_type,
         ADD INDEX idx_storage_key (file_storage_key)`
      );

      console.log('[Migration] Migration completed successfully');

      return NextResponse.json({
        message: 'Migration executed successfully',
        migrated: true,
      });
    } else {
      // Column already exists
      return NextResponse.json({
        message: 'Migration not needed, column already exists',
        migrated: false,
      });
    }
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
