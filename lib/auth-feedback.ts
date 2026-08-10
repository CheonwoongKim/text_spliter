export type AuthOperation = "signin" | "signup" | "request-reset" | "update-password";

type ErrorWithCode = { code?: unknown };

export function getAuthErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  const code = (error as ErrorWithCode).code;
  return typeof code === "string" ? code : null;
}

export function isExistingAccountError(error: unknown): boolean {
  const code = getAuthErrorCode(error);
  return code === "email_exists" || code === "user_already_exists";
}

export function isPrivatePasswordResetError(error: unknown): boolean {
  return getAuthErrorCode(error) === "user_not_found";
}

const DEFAULT_MESSAGES: Record<AuthOperation, string> = {
  signin: "Could not sign in. Please try again.",
  signup: "Could not create your account. Please try again.",
  "request-reset": "Could not send a reset link. Check your connection and try again.",
  "update-password": "Could not update your password. Please request a new reset link.",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email or password is incorrect.",
  email_not_confirmed: "Confirm your email address before signing in.",
  email_address_invalid: "Enter a valid email address.",
  signup_disabled: "Account creation is currently unavailable.",
  email_provider_disabled: "Account creation is currently unavailable.",
  weak_password: "Choose a password that meets every requirement below.",
  same_password: "Choose a password different from your current password.",
  session_not_found: "This reset link is invalid or has expired. Request a new link.",
  session_expired: "This reset link is invalid or has expired. Request a new link.",
  flow_state_not_found: "This reset link is invalid or has expired. Request a new link.",
  flow_state_expired: "This reset link is invalid or has expired. Request a new link.",
  otp_expired: "This reset link is invalid or has expired. Request a new link.",
  over_request_rate_limit: "Too many attempts. Wait a moment and try again.",
  over_email_send_rate_limit: "Too many attempts. Wait a moment and try again.",
  request_timeout:
    "The authentication service did not respond. Check your connection and try again.",
};

export function getSafeAuthErrorMessage(
  operation: AuthOperation,
  error: unknown,
): string {
  const code = getAuthErrorCode(error);
  return (code && ERROR_MESSAGES[code]) || DEFAULT_MESSAGES[operation];
}
