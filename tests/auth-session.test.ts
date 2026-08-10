import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { restoreAuthSession } from "../lib/auth-session";

function authWithSession(result: unknown): SupabaseClient["auth"] {
  return {
    getSession: async () => result,
  } as unknown as SupabaseClient["auth"];
}

test("session restoration returns the verified client session", async () => {
  const session = { access_token: "restored-token" };
  const restored = await restoreAuthSession(
    authWithSession({ data: { session }, error: null }),
  );

  assert.equal(restored, session);
});

test("session restoration rejects both Supabase and transport failures", async () => {
  const authError = { code: "session_not_found", message: "missing" };
  await assert.rejects(
    restoreAuthSession(authWithSession({ data: { session: null }, error: authError })),
    (error) => error === authError,
  );

  const transportError = new Error("offline");
  const rejectedAuth = {
    getSession: async () => {
      throw transportError;
    },
  } as unknown as SupabaseClient["auth"];
  await assert.rejects(restoreAuthSession(rejectedAuth), transportError);
});
