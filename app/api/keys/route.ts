import { NextRequest, NextResponse } from 'next/server';
import { encrypt, decrypt } from '@/lib/encryption';
import { getUserEmailFromToken } from '@/lib/auth-server';
import { getStoredApiKeys } from '@/lib/api-key-store';
import { assertSupabaseResult, getAppSupabase } from '@/lib/supabase-server';
import { CONNECT_KEY_NAMES } from '@/lib/constants';

const connectKeyNameSet = new Set<string>(CONNECT_KEY_NAMES);

// GET - Retrieve all API keys for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await getStoredApiKeys(userEmail);

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
    const userEmail = await getUserEmailFromToken(request);

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid key payload' }, { status: 400 });
    }

    const entries = Object.entries(body as Record<string, unknown>);
    const invalidNames = entries
      .filter(([keyName, value]) => !connectKeyNameSet.has(keyName) || typeof value !== 'string')
      .map(([keyName]) => keyName);

    if (invalidNames.length > 0) {
      return NextResponse.json(
        { error: `Unsupported key fields: ${invalidNames.join(', ')}` },
        { status: 400 }
      );
    }

    const rows = (entries as Array<[string, string]>)
      .filter(([, value]) => value.trim().length > 0)
      .map(([keyName, value]) => ({
        user_email: userEmail,
        key_name: keyName,
        encrypted_key: encrypt(value),
      }));
    const deletedKeyNames = (entries as Array<[string, string]>)
      .filter(([, value]) => value.trim().length === 0)
      .map(([keyName]) => keyName);

    if (rows.length > 0) {
      const { error } = await getAppSupabase()
        .from('user_api_keys')
        .upsert(rows, { onConflict: 'user_email,key_name' });
      assertSupabaseResult(error, 'Failed to save API keys');
    }

    if (deletedKeyNames.length > 0) {
      const { error } = await getAppSupabase()
        .from('user_api_keys')
        .delete()
        .eq('user_email', userEmail)
        .in('key_name', deletedKeyNames);
      assertSupabaseResult(error, 'Failed to remove cleared API keys');
    }

    return NextResponse.json({
      success: true,
      saved: rows.length,
      deleted: deletedKeyNames.length,
    });
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
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyName = searchParams.get('keyName');
    const deleteAll = searchParams.get('all') === 'true';

    if (!deleteAll && !keyName) {
      return NextResponse.json(
        { error: 'Key name is required unless all=true' },
        { status: 400 }
      );
    }

    if (keyName && !connectKeyNameSet.has(keyName)) {
      return NextResponse.json({ error: 'Unsupported key name' }, { status: 400 });
    }

    let deletion = getAppSupabase()
      .from('user_api_keys')
      .delete()
      .eq('user_email', userEmail);

    if (!deleteAll && keyName) {
      deletion = deletion.eq('key_name', keyName);
    }

    const { error } = await deletion;
    assertSupabaseResult(error, 'Failed to delete API key');

    return NextResponse.json({ success: true, deletedAll: deleteAll });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
