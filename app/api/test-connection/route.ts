import { NextRequest, NextResponse } from 'next/server';
import { getUserEmailFromToken } from '@/lib/auth-server';
import { API_ENDPOINTS, CONNECT_KEY_NAMES } from '@/lib/constants';
import { getGoogleServiceAccountAccessToken } from '@/lib/google-auth';
import { getDecryptedApiKeyMap } from '@/lib/api-key-store';

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
  doclingEndpoint?: string;
  doclingApiKey?: string;
}

const connectKeyNameSet = new Set<string>(CONNECT_KEY_NAMES);

// POST - Test API connection
export async function POST(request: NextRequest) {
  try {
    const userEmail = await getUserEmailFromToken(request);
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { service, credentials } = body as {
      service: string;
      credentials?: Record<string, unknown>;
    };

    if (!service) {
      return NextResponse.json(
        { error: 'Service type is required' },
        { status: 400 }
      );
    }

    const providedCredentials = credentials || {};
    const invalidCredentialNames = Object.entries(providedCredentials)
      .filter(([keyName, value]) => !connectKeyNameSet.has(keyName) || typeof value !== 'string')
      .map(([keyName]) => keyName);

    if (invalidCredentialNames.length > 0) {
      return NextResponse.json(
        { error: `Unsupported credential fields: ${invalidCredentialNames.join(', ')}` },
        { status: 400 }
      );
    }

    const decryptedKeys = await getDecryptedApiKeyMap(userEmail);
    const resolvedKeys = {
      ...decryptedKeys,
      ...(providedCredentials as Record<string, string>),
    };

    if (!Object.values(resolvedKeys).some((value) => value.trim().length > 0)) {
      return NextResponse.json(
        { error: 'No API keys found. Please configure your API keys first.' },
        { status: 404 }
      );
    }

    const keys = resolvedKeys as ApiKeys;

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

      case 'docling':
        return await testDocling(keys.doclingEndpoint, keys.doclingApiKey);

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
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
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
    const response = await fetch(API_ENDPOINTS.LLAMA_PARSE_UPLOAD, {
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

    // Missing multipart fields should produce 400/422 with a valid key.
    if (!response.ok && response.status !== 400 && response.status !== 422) {
      return NextResponse.json(
        { success: false, error: `LlamaParse connection failed (HTTP ${response.status})` },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, message: 'LlamaParse v2 API key is valid' });
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

    const accessToken = await getGoogleServiceAccountAccessToken(
      serviceAccountEmail,
      privateKey
    );
    const processorUrl = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}`;
    const processorResponse = await fetch(processorUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!processorResponse.ok) {
      const details = await processorResponse.text();
      return NextResponse.json(
        { success: false, error: `Google Document AI processor validation failed: ${details}` },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Google Document AI credentials and processor are valid.'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 200 }
    );
  }
}

async function testDocling(endpoint?: string, apiKey?: string): Promise<NextResponse> {
  if (!endpoint) {
    return NextResponse.json(
      { success: false, error: 'Docling server endpoint not configured' },
      { status: 400 }
    );
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    const response = await fetch(
      `${endpoint.replace(/\/+$/, '')}/v1/convert/source`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      }
    );

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { success: false, error: 'Invalid Docling API key' },
        { status: 200 }
      );
    }

    if (response.status === 404) {
      return NextResponse.json(
        { success: false, error: 'Docling conversion endpoint not found' },
        { status: 200 }
      );
    }

    // An empty conversion request normally returns 400/422. That still proves
    // that the server and optional API-key boundary are reachable.
    if (!response.ok && response.status !== 400 && response.status !== 422) {
      return NextResponse.json(
        { success: false, error: `Docling connection failed (HTTP ${response.status})` },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Docling server connection successful'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 200 }
    );
  }
}
