import assert from "node:assert/strict";
import test from "node:test";
import {
  getAuthErrorCode,
  getSafeAuthErrorMessage,
  isExistingAccountError,
  isPrivatePasswordResetError,
} from "../lib/auth-feedback";

test("authentication errors expose stable product copy instead of provider messages", () => {
  const invalidCredentials = {
    code: "invalid_credentials",
    message: "provider-specific internal wording",
  };

  assert.equal(getAuthErrorCode(invalidCredentials), "invalid_credentials");
  assert.equal(
    getSafeAuthErrorMessage("signin", invalidCredentials),
    "Email or password is incorrect.",
  );
  assert.doesNotMatch(
    getSafeAuthErrorMessage("signin", invalidCredentials),
    /provider-specific/,
  );
  assert.equal(
    getSafeAuthErrorMessage("signin", new Error("secret upstream detail")),
    "Could not sign in. Please try again.",
  );
});

test("signup and reset helpers avoid account enumeration", () => {
  assert.equal(isExistingAccountError({ code: "email_exists" }), true);
  assert.equal(isExistingAccountError({ code: "user_already_exists" }), true);
  assert.equal(isExistingAccountError({ code: "invalid_credentials" }), false);
  assert.equal(isPrivatePasswordResetError({ code: "user_not_found" }), true);
  assert.equal(isPrivatePasswordResetError({ code: "over_email_send_rate_limit" }), false);
  assert.equal(isPrivatePasswordResetError({ code: "request_timeout" }), false);
});
