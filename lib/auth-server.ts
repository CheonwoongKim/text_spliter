import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from './validation';

/**
 * Extract user email from JWT token in server-side API routes
 * @param request - Next.js request object
 * @returns User email or null if token is invalid or expired
 */
export function getUserEmailFromToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    // Check if token is expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.log('[Auth] Token expired:', { exp: payload.exp, now: Date.now() / 1000 });
      return null;
    }

    return payload.email || null;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
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
      const userEmail = getUserEmailFromToken(request);

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
