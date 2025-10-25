import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/encryption';
import { getUserEmailFromToken } from '@/lib/auth-server';

interface ApiKey {
  id: number;
  user_email: string;
  key_name: string;
  encrypted_key: string;
  created_at: string;
  updated_at: string;
}

// GET - Retrieve all API keys for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromToken(request);

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await query<ApiKey[]>(
      'SELECT * FROM user_api_keys WHERE user_email = ?',
      [userEmail]
    );

    // If no keys found, return empty object
    if (keys.length === 0) {
      return NextResponse.json({});
    }

    // Decrypt keys before sending
    const decryptedKeys = keys.map(key => {
      try {
        return {
          keyName: key.key_name,
          value: decrypt(key.encrypted_key),
        };
      } catch (decryptError) {
        console.error('[API /keys GET] Failed to decrypt key:', key.key_name, decryptError);
        return {
          keyName: key.key_name,
          value: '',
        };
      }
    });

    // Transform to match frontend format
    const result: Record<string, string> = {};
    decryptedKeys.forEach(key => {
      result[key.keyName] = key.value;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /keys GET] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch API keys',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Save or update API keys
export async function POST(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromToken(request);

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const keys = body as Record<string, string>;

    // Save each key
    for (const [keyName, value] of Object.entries(keys)) {
      if (!value) {
        continue; // Skip empty values
      }

      const encryptedKey = encrypt(value);

      await query(
        `INSERT INTO user_api_keys (user_email, key_name, encrypted_key)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE encrypted_key = ?, updated_at = CURRENT_TIMESTAMP`,
        [userEmail, keyName, encryptedKey, encryptedKey]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /keys POST] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to save API keys',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific API key
export async function DELETE(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyName = searchParams.get('keyName');

    if (!keyName) {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
    }

    await query(
      'DELETE FROM user_api_keys WHERE user_email = ? AND key_name = ?',
      [userEmail, keyName]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
