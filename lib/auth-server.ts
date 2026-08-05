import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { ValidationError } from './validation';
import { getAppSupabase } from './supabase-server';

function accessTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  return authHeader?.replace(/^Bearer\s+/i, '') || request.cookies.get('auth_token')?.value || null;
}

export async function getUserFromToken(request: NextRequest): Promise<User | null> {
  const token = accessTokenFromRequest(request);

  if (!token) {
    return null;
  }

  const { data, error } = await getAppSupabase().auth.getUser(token);

  if (error || !data.user) {
    if (error) {
      console.warn('[Auth] Supabase rejected access token:', error.message);
    }
    return null;
  }

  return data.user;
}

/**
 * Extract user email from JWT token in server-side API routes
 * @param request - Next.js request object
 * @returns User email or null if token is invalid or expired
 */
export async function getUserEmailFromToken(request: NextRequest): Promise<string | null> {
  const user = await getUserFromToken(request);
  return user?.email || null;
}

/**
 * Create unauthorized error response
 */
export function createUnauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Higher-order function to wrap API route handlers with authentication
 * @param handler - The actual route handler that receives the request and userEmail
 * @returns Wrapped handler with authentication
 *
 * @example
 * export const POST = withAuth(async (request, userEmail) => {
 *   // Your handler code here
 *   return NextResponse.json({ success: true });
 * });
 */
export function withAuth<T = any>(
  handler: (request: NextRequest, userEmail: string) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const userEmail = await getUserEmailFromToken(request);

      if (!userEmail) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      return await handler(request, userEmail);
    } catch (error) {
      console.error('[withAuth] Error:', error);

      // Handle validation errors
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      // Handle other errors
      return NextResponse.json(
        {
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Create a standardized error response
 * @param error - The error object
 * @param defaultMessage - Default error message
 * @returns NextResponse with appropriate status code
 */
export function createErrorResponse(error: unknown, defaultMessage: string = 'An error occurred'): NextResponse {
  console.error(defaultMessage, error);

  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      error: defaultMessage,
      details: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}
