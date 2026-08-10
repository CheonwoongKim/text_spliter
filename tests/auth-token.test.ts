import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  clearAuthTokens,
  getAuthToken,
  setAuthToken,
  syncAuthSession,
} from "../lib/auth";

test("Supabase owns persistence while legacy callers receive the current in-memory token", () => {
  clearAuthTokens();
  assert.equal(getAuthToken(), null);

  setAuthToken("first-token");
  assert.equal(getAuthToken(), "first-token");

  syncAuthSession({ access_token: "refreshed-token" } as never);
  assert.equal(getAuthToken(), "refreshed-token");

  syncAuthSession(null);
  assert.equal(getAuthToken(), null);

  const source = readFileSync("lib/auth.ts", "utf8");
  const setTokenBody = source.slice(
    source.indexOf("export function setAuthToken"),
    source.indexOf("export function clearAuthTokens"),
  );
  assert.doesNotMatch(setTokenBody, /localStorage\.setItem/);
});
