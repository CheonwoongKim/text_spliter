/**
 * Authentication utility functions
 */

import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export const AUTH_TOKEN_KEY = "auth_token";
const REMEMBERED_EMAIL_KEY = "remembered_login_email";

/**
 * Get the authentication token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Set the authentication token in localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Remove all authentication tokens from localStorage
 */
export function clearAuthTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem("refresh_token");
}

export function getRememberedEmail(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
  } catch {
    return null;
  }
}

export function saveRememberedEmail(email: string | null): void {
  if (typeof window === "undefined") return;

  try {
    const normalizedEmail = email?.trim();
    if (normalizedEmail) {
      window.localStorage.setItem(REMEMBERED_EMAIL_KEY, normalizedEmail);
    } else {
      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
  } catch {
    // Storage access can be blocked by browser privacy settings. Login must still work.
  }
}

/**
 * Keep legacy API helpers synchronized with the verified Supabase session.
 * Supabase remains the source of truth for session persistence and refresh.
 */
export function syncAuthSession(session: Session | null): void {
  if (!session) {
    clearAuthTokens();
    return;
  }

  setAuthToken(session.access_token);
}

export async function signOut(): Promise<void> {
  try {
    await getBrowserSupabase().auth.signOut({ scope: "local" });
  } finally {
    clearAuthTokens();
  }
}

/**
 * Check if user is authenticated (has a token)
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * Get authorization headers for API requests
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Handle 401 Unauthorized response - logout and redirect to login
 */
export function handleUnauthorized(): void {
  if (typeof window === "undefined") return;

  console.log('[Auth] Unauthorized - clearing tokens and redirecting to login');
  clearAuthTokens();

  void getBrowserSupabase().auth.signOut({ scope: "local" }).catch((error) => {
    console.error('[Auth] Failed to clear Supabase session:', error);
  });

  // Redirect to login page
  window.location.href = '/login';
}

/**
 * Check if token is expired (client-side check)
 */
export function isTokenExpired(): boolean {
  const token = getAuthToken();
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Check if token has expiration and if it's expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
}

/**
 * Fetch wrapper that automatically handles 401 responses
 */
export async function authFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const token = getAuthToken();

  // Check token expiration before making request
  if (isTokenExpired()) {
    handleUnauthorized();
    throw new Error('Token expired');
  }

  const headers = {
    ...options?.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized');
  }

  return response;
}
