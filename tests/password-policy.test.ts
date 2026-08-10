import assert from "node:assert/strict";
import test from "node:test";
import {
  getPasswordPolicyError,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENT_TEXT,
} from "../lib/password-policy";

test("signup password policy accepts only the documented character mix", () => {
  assert.equal(PASSWORD_MIN_LENGTH, 8);
  // The hint has to name every rule getPasswordPolicyError enforces, or a
  // person is told their password is wrong without being told what is missing.
  for (const rule of [/8\+/, /mixed case/i, /number/i, /symbol/i]) {
    assert.match(PASSWORD_REQUIREMENT_TEXT, rule);
  }
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
