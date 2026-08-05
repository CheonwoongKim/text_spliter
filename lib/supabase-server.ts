import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let appSupabaseClient: SupabaseClient | null = null;

function appSupabaseCredentials(): { url: string; secretKey: string } {
  const url = process.env.APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const secretKey =
    process.env.APP_SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Supabase application database is not configured. Set APP_SUPABASE_URL and APP_SUPABASE_SECRET_KEY."
    );
  }

  return { url, secretKey };
}

/**
 * Server-only client for application persistence.
 *
 * The secret/service-role key must never be imported by a client component.
 * Authentication and user scoping remain enforced in the API routes.
 */
export function getAppSupabase(): SupabaseClient {
  if (!appSupabaseClient) {
    const { url, secretKey } = appSupabaseCredentials();
    appSupabaseClient = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          "X-Client-Info": "text-splitter-server",
        },
      },
    });
  }

  return appSupabaseClient;
}

export function isAppSupabaseConfigured(): boolean {
  return Boolean(
    (process.env.APP_SUPABASE_URL || process.env.SUPABASE_URL) &&
    (
      process.env.APP_SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  );
}

export function assertSupabaseResult(
  error: { message: string; code?: string; details?: string | null } | null,
  operation: string
): void {
  if (!error) return;

  const code = error.code ? ` (${error.code})` : "";
  throw new Error(`${operation}${code}: ${error.message}`);
}
