import "server-only";

import { decrypt } from "@/lib/encryption";
import { assertSupabaseResult, getAppSupabase } from "@/lib/supabase-server";

export interface StoredApiKey {
  id: number;
  user_email: string;
  key_name: string;
  encrypted_key: string;
  created_at: string;
  updated_at: string;
}

export async function getStoredApiKeys(
  userEmail: string,
  keyNames?: string[]
): Promise<StoredApiKey[]> {
  const supabase = getAppSupabase();
  let request = supabase
    .from("user_api_keys")
    .select("*")
    .eq("user_email", userEmail);

  if (keyNames?.length) {
    request = request.in("key_name", keyNames);
  }

  const { data, error } = await request;
  assertSupabaseResult(error, "Failed to load API keys");
  return (data || []) as StoredApiKey[];
}

export async function getDecryptedApiKeyMap(
  userEmail: string,
  keyNames?: string[]
): Promise<Record<string, string>> {
  const rows = await getStoredApiKeys(userEmail, keyNames);
  const result: Record<string, string> = {};

  rows.forEach((row) => {
    result[row.key_name] = decrypt(row.encrypted_key);
  });

  return result;
}
