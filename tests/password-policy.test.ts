import assert from "node:assert/strict";
import test from "node:test";
import {
  getPasswordPolicyError,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENT_TEXT,
} from "../lib/password-policy";

test("signup password policy accepts only the documented character mix", () => {
  assert.equal(PASSWORD_MIN_LENGTH, 8);
  assert.match(PASSWORD_REQUIREMENT_TEXT, /대·소문자/);
  assert.equal(getPasswordPolicyError("Strong1!"), null);

  for (const password of [
    "Short1!",
    "lowercase1!",
    "UPPERCASE1!",
    "NoNumber!",
    "NoSymbol1",
  ]) {
    assert.ok(getPasswordPolicyError(password), `${password} should be rejected`);
  }
});
