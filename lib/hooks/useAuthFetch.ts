import { useCallback } from 'react';
import { getAuthToken } from '@/lib/auth';

interface FetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

interface AuthFetchError extends Error {
  status?: number;
  data?: unknown;
}

/**
 * Custom hook for making authenticated fetch requests
 * Automatically adds Authorization header from stored token
 */
export function useAuthFetch() {
  const authFetch = useCallback(async <T = unknown>(
    url: string,
    options: FetchOptions = {}
  ): Promise<T> => {
    const token = getAuthToken();

    if (!token) {
      const error = new Error('Please login first') as AuthFetchError;
      error.status = 401;
      throw error;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: 'Request failed' };
      }

      const error = new Error(
        (errorData as { error?: string; details?: string })?.details ||
        (errorData as { error?: string })?.error ||
        'Request failed'
      ) as AuthFetchError;
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    return response.json() as Promise<T>;
  }, []);

  return authFetch;
}
