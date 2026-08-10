import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const guard = readFileSync("components/layout/AuthGuard.tsx", "utf8");

test("public authentication routes render before session restoration finishes", () => {
  for (const path of ["/login", "/signup", "/forgot-password", "/reset-password"]) {
    assert.ok(guard.includes(`"${path}"`), `${path} must be public`);
  }

  const publicReturn = guard.indexOf("if (isPublicPath)");
  const loadingReturn = guard.indexOf("if (isChecking || !session)");
  assert.ok(publicReturn >= 0 && publicReturn < loadingReturn);
  assert.match(guard, /REDIRECT_AUTHENTICATED_PATHS[\s\S]*"\/forgot-password"/);
  assert.doesNotMatch(
    guard.slice(
      guard.indexOf("const REDIRECT_AUTHENTICATED_PATHS"),
      guard.indexOf("export default function"),
    ),
    /reset-password/,
    "a recovery session must remain on the password update screen",
  );
});

test("session initialization handles synchronous and asynchronous failures", () => {
  assert.match(guard, /\.catch\(failSessionCheck\)/);
  assert.match(guard, /try \{[\s\S]*getBrowserSupabase\(\)[\s\S]*\} catch \(error\)/);
  assert.match(guard, /setCheckError\(/);
  assert.match(guard, /setCheckAttempt\(\(attempt\) => attempt \+ 1\)/);
  assert.match(guard, /authListener\.subscription\.unsubscribe\(\)/);
});
