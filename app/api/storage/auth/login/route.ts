import { NextRequest } from 'next/server';

const STORAGE_API_BASE = process.env.STORAGE_API_BASE || 'http://ywstorage.synology.me:4000';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const TIMEOUT = 10000; // 10 seconds

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchWithRetry(url: string, options: RequestInit, retries: number = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Storage Auth] Attempt ${i + 1}/${retries}`);
      const response = await fetchWithTimeout(url, options, TIMEOUT);
      return response;
    } catch (error: any) {
      const isLastAttempt = i === retries - 1;
      const isNetworkError = error.name === 'TypeError' ||
                             error.code === 'ECONNRESET' ||
                             error.code === 'UND_ERR_SOCKET' ||
                             error.name === 'AbortError';

      if (isLastAttempt || !isNetworkError) {
        throw error;
      }

      console.log(`[Storage Auth] Network error, retrying in ${RETRY_DELAY}ms...`, error.message);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  throw new Error('Max retries reached');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Storage Auth] Login attempt for:', email);

    const response = await fetchWithRetry(`${STORAGE_API_BASE}/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('[Storage Auth] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Storage Auth] Error response:', errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Login failed' };
      }

      return new Response(
        JSON.stringify({ error: errorData.error || errorData.message || 'Login failed' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('[Storage Auth] Login successful');

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Storage Auth] Error during login:', error);

    let errorMessage = 'Failed to connect to storage server';
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout - please try again';
    } else if (error.code === 'ECONNRESET' || error.code === 'UND_ERR_SOCKET') {
      errorMessage = 'Connection lost - please check your network';
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
