import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/encryption';

interface ApiKey {
  id: number;
  user_email: string;
  key_name: string;
  encrypted_key: string;
  created_at: string;
  updated_at: string;
}

// Verify JWT token and extract user email
function getUserEmailFromToken(request: NextRequest): string | null {
  // Get token from Authorization header or cookie
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth_token')?.value;

  console.log('Authorization header:', authHeader);
  console.log('Token:', token ? 'exists' : 'missing');

  if (!token) {
    console.log('No token found');
    return null;
  }

  try {
    // Decode JWT token (basic decode without verification for now)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.log('Decoded payload:', payload);
    console.log('Email from payload:', payload.email);
    return payload.email || null;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

// GET - Retrieve all API keys for the authenticated user
export async function GET(request: NextRequest) {
  try {
    console.log('[API /keys GET] Starting request...');

    const userEmail = getUserEmailFromToken(request);
    console.log('[API /keys GET] User email:', userEmail);

    if (!userEmail) {
      console.log('[API /keys GET] No user email - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[API /keys GET] Querying database for user:', userEmail);
    const keys = await query<ApiKey[]>(
      'SELECT * FROM user_api_keys WHERE user_email = ?',
      [userEmail]
    );
    console.log('[API /keys GET] Found', keys.length, 'keys');

    // If no keys found, return empty object
    if (keys.length === 0) {
      console.log('[API /keys GET] No keys found, returning empty object');
      return NextResponse.json({});
    }

    // Decrypt keys before sending
    console.log('[API /keys GET] Decrypting keys...');
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

    console.log('[API /keys GET] Successfully returning', Object.keys(result).length, 'keys');
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /keys GET] Error:', error);
    console.error('[API /keys GET] Error stack:', error instanceof Error ? error.stack : 'No stack');
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
    console.log('[API /keys POST] Starting request...');

    const userEmail = getUserEmailFromToken(request);
    console.log('[API /keys POST] User email:', userEmail);

    if (!userEmail) {
      console.log('[API /keys POST] No user email - Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const keys = body as Record<string, string>;
    console.log('[API /keys POST] Saving', Object.keys(keys).length, 'keys');

    // Save each key
    for (const [keyName, value] of Object.entries(keys)) {
      if (!value) {
        console.log('[API /keys POST] Skipping empty key:', keyName);
        continue; // Skip empty values
      }

      console.log('[API /keys POST] Encrypting and saving key:', keyName);
      const encryptedKey = encrypt(value);

      await query(
        `INSERT INTO user_api_keys (user_email, key_name, encrypted_key)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE encrypted_key = ?, updated_at = CURRENT_TIMESTAMP`,
        [userEmail, keyName, encryptedKey, encryptedKey]
      );
    }

    console.log('[API /keys POST] Successfully saved keys');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /keys POST] Error:', error);
    console.error('[API /keys POST] Error stack:', error instanceof Error ? error.stack : 'No stack');
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
