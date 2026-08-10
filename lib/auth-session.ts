import type { Session, SupabaseClient } from "@supabase/supabase-js";

type SessionReader = Pick<SupabaseClient["auth"], "getSession">;

export async function restoreAuthSession(auth: SessionReader): Promise<Session | null> {
  const { data, error } = await auth.getSession();
  if (error) throw error;
  return data.session;
}
