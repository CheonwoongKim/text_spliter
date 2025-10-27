import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserEmailFromToken } from '@/lib/auth-server';

const STORAGE_API_BASE = process.env.STORAGE_API_BASE || 'http://ywstorage.synology.me:4000';
const DEFAULT_BUCKET = process.env.STORAGE_DEFAULT_BUCKET || 'loan-agent-files';

interface ParseResult {
  id: number;
  file_name: string;
  file_storage_key: string | null;
}

interface StorageFile {
  key: string;
  name?: string;  // name might not exist, use key as fallback
  size: number;
  lastModified: string;
  contentType: string;
}

// POST - Sync parse results with storage files by matching file names
export async function POST(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all parse results without storage key
    const parseResults = await query<ParseResult[]>(
      'SELECT id, file_name, file_storage_key FROM parse_results WHERE user_email = ? AND file_storage_key IS NULL',
      [userEmail]
    );

    if (parseResults.length === 0) {
      return NextResponse.json({
        message: 'No parse results to sync',
        updated: 0,
      });
    }

    // Get all files from storage
    const authHeader = request.headers.get('authorization');
    const storageResponse = await fetch(
      `${STORAGE_API_BASE}/v1/storage/buckets/${DEFAULT_BUCKET}/objects`,
      {
        headers: {
          'Authorization': authHeader || '',
        },
      }
    );

    if (!storageResponse.ok) {
      throw new Error('Failed to fetch storage files');
    }

    const storageData = await storageResponse.json();
    const storageFiles: StorageFile[] = storageData.objects || [];

    // Create a map of file names to storage keys
    // Extract basename from both file.name and file.key for matching
    const fileNameMap = new Map<string, string>();
    storageFiles.forEach((file) => {
      // Get basename from key (file.name might not exist)
      const keyBasename = file.key.split('/').pop() || file.key;

      // Add key and basename to map
      fileNameMap.set(keyBasename, file.key);
      fileNameMap.set(file.key, file.key);

      // If name exists and is different from key, also add it
      if (file.name && file.name !== file.key) {
        const nameBasename = file.name.split('/').pop() || file.name;
        fileNameMap.set(nameBasename, file.key);
        fileNameMap.set(file.name, file.key);
      }
    });

    // Update parse results with matching storage keys
    let updatedCount = 0;
    const updates: Array<{ id: number; key: string; fileName: string }> = [];

    for (const result of parseResults) {
      // Try exact match first
      let storageKey = fileNameMap.get(result.file_name);

      // If no exact match, try basename match
      if (!storageKey) {
        const basename = result.file_name.split('/').pop() || result.file_name;
        storageKey = fileNameMap.get(basename);
      }

      if (storageKey) {
        updates.push({ id: result.id, key: storageKey, fileName: result.file_name });
      }
    }

    // Batch update
    if (updates.length > 0) {
      for (const update of updates) {
        await query(
          'UPDATE parse_results SET file_storage_key = ? WHERE id = ?',
          [update.key, update.id]
        );
        updatedCount++;
      }
    }

    console.log('[Sync Storage] Results:', {
      total: parseResults.length,
      updated: updatedCount,
      storageFilesCount: storageFiles.length,
      parseResultFileNames: parseResults.map(r => r.file_name),
      storageFileKeys: storageFiles.map(f => f.key),
      matches: updates,
    });

    return NextResponse.json({
      message: `Successfully synced ${updatedCount} parse results`,
      updated: updatedCount,
      total: parseResults.length,
      matches: updates.map(u => ({ id: u.id, key: u.key, fileName: u.fileName })),
    });
  } catch (error) {
    console.error('Error syncing parse results with storage:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync parse results',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
