import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailFromToken } from '@/lib/auth-server';
import { query } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { createClient } from '@supabase/supabase-js';

interface ApiKey {
  id: number;
  user_email: string;
  key_name: string;
  encrypted_key: string;
  created_at: string;
  updated_at: string;
}

interface ApiKeys {
  openaiEmbedding?: string;
  upstageParser?: string;
  llamaParser?: string;
  azureParserKey?: string;
  azureParserEndpoint?: string;
  googleParserServiceAccountEmail?: string;
  googleParserPrivateKey?: string;
  googleParserProjectId?: string;
  googleParserLocation?: string;
  googleParserProcessorId?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

// POST - Test API connection
export async function POST(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { service } = body as { service: string };

    if (!service) {
      return NextResponse.json(
        { error: 'Service type is required' },
        { status: 400 }
      );
    }

    // Get API keys from database
    const dbKeys = await query<ApiKey[]>(
      'SELECT * FROM user_api_keys WHERE user_email = ?',
      [userEmail]
    );

    if (dbKeys.length === 0) {
      return NextResponse.json(
        { error: 'No API keys found. Please configure your API keys first.' },
        { status: 404 }
      );
    }

    // Decrypt and map keys
    const keys: ApiKeys = {};
    dbKeys.forEach(key => {
      try {
        const decryptedValue = decrypt(key.encrypted_key);
        keys[key.key_name as keyof ApiKeys] = decryptedValue;
      } catch (error) {
        console.error(`Failed to decrypt key: ${key.key_name}`, error);
      }
    });

    // Test the specific service
    switch (service) {
      case 'openai':
        return await testOpenAI(keys.openaiEmbedding);

      case 'upstage':
        return await testUpstage(keys.upstageParser);

      case 'llama':
        return await testLlama(keys.llamaParser);

      case 'azure':
        return await testAzure(keys.azureParserKey, keys.azureParserEndpoint);

      case 'google':
        return await testGoogle(
          keys.googleParserServiceAccountEmail,
          keys.googleParserPrivateKey,
          keys.googleParserProjectId,
          keys.googleParserLocation,
          keys.googleParserProcessorId
        );

      case 'supabase':
        return await testSupabase(keys.supabaseUrl, keys.supabaseKey);

      default:
        return NextResponse.json(
          { error: 'Unknown service type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      {
        error: 'Failed to test connection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function testOpenAI(apiKey?: string): Promise<NextResponse> {
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'OpenAI API key not configured' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: 'test',
        model: 'text-embedding-ada-002',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { success: false, error: error.error?.message || 'Invalid API key or connection failed' },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, message: 'OpenAI API connection successful' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 200 }
    );
  }
}

async function testUpstage(apiKey?: string): Promise<NextResponse> {
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Upstage API key not configured' },
      { status: 400 }
    );
  }

  try {
    // Test with a simple API check - we can't test document parsing without a file
    // So we'll just verify the API key format and endpoint availability
    const response = await fetch('https://api.upstage.ai/v1/document-ai/document-parse', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: new FormData(), // Empty form data will fail but confirms endpoint is reachable
    });

    // We expect a 400 or similar error since we're not sending a file, but not 401 (unauthorized)
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, message: 'Upstage API key is valid' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 200 }
    );
  }
}

async function testLlama(apiKey?: string): Promise<NextResponse> {
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'LlamaIndex API key not configured' },
      { status: 400 }
    );
  }

  try {
    // LlamaParse API check - we'll verify the key with a minimal request
    const response = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: new FormData(), // Empty form data
    });

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, message: 'LlamaIndex API key is valid' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 200 }
    );
  }
}

async function testAzure(apiKey?: string, endpoint?: string): Promise<NextResponse> {
  if (!apiKey || !endpoint) {
    return NextResponse.json(
      { success: false, error: 'Azure API key and endpoint not configured' },
      { status: 400 }
    );
  }

  try {
    // Test Azure endpoint availability
    const testUrl = `${endpoint}/formrecognizer/documentModels/prebuilt-layout?api-version=2023-07-31`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key or endpoint' },
        { status: 200 }
      );
    }

    if (!response.ok && response.status !== 404) {
      return NextResponse.json(
        { success: false, error: 'Connection failed - check endpoint URL' },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, message: 'Azure API connection successful' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 200 }
    );
  }
}

async function testGoogle(serviceAccountEmail?: string, privateKey?: string, projectId?: string, location?: string, processorId?: string): Promise<NextResponse> {
  if (!serviceAccountEmail || !privateKey || !projectId || !location || !processorId) {
    return NextResponse.json(
      { success: false, error: 'Google API credentials not fully configured' },
      { status: 400 }
    );
  }

  try {
    // Validate service account email format
    if (!serviceAccountEmail.includes('@') || !serviceAccountEmail.includes('.iam.gserviceaccount.com')) {
      return NextResponse.json(
        { success: false, error: 'Invalid Service Account Email format' },
        { status: 200 }
      );
    }

    // Validate private key format - normalize whitespace for checking
    const normalizedKey = privateKey.replace(/\s+/g, ' ').trim();
    if (!normalizedKey.includes('BEGIN PRIVATE KEY') || !normalizedKey.includes('END PRIVATE KEY')) {
      return NextResponse.json(
        { success: false, error: 'Invalid Private Key format - must include BEGIN and END markers' },
        { status: 200 }
      );
    }

    // Check if private key has the correct structure (should have base64 content)
    const keyContent = privateKey.replace(/-----BEGIN PRIVATE KEY-----/g, '')
                                 .replace(/-----END PRIVATE KEY-----/g, '')
                                 .replace(/\s+/g, '');
    if (keyContent.length < 100) {
      return NextResponse.json(
        { success: false, error: 'Private Key appears to be too short or incomplete' },
        { status: 200 }
      );
    }

    // Validate other fields
    if (projectId.length < 3 || location.length < 2 || processorId.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid Project ID, Location, or Processor ID' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Google API credentials format is valid. Full validation requires document processing.'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 200 }
    );
  }
}

async function testSupabase(url?: string, apiKey?: string): Promise<NextResponse> {
  if (!url || !apiKey) {
    return NextResponse.json(
      { success: false, error: 'Supabase URL and API key not configured' },
      { status: 400 }
    );
  }

  try {
    const supabase = createClient(url, apiKey);

    // Test connection by querying pg_catalog
    const { data, error } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .limit(1);

    if (error) {
      // Try a simpler test - just check if we can initialize the client
      const { error: authError } = await supabase.auth.getSession();

      if (authError && authError.message.includes('Invalid API key')) {
        return NextResponse.json(
          { success: false, error: 'Invalid Supabase API key' },
          { status: 200 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Supabase connection successful (limited access)'
      });
    }

    return NextResponse.json({ success: true, message: 'Supabase connection successful' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 200 }
    );
  }
}
