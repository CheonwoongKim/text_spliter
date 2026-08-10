export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REQUIREMENT_TEXT =
  "8+ chars, mixed case, number, symbol";

const PASSWORD_REQUIREMENTS = [
  /[a-z]/,
  /[A-Z]/,
  /[0-9]/,
  /[\p{P}\p{S}]/u,
] as const;

const PASSWORD_POLICY_ERROR =
  "Password must be at least 8 characters and include upper and lower case letters, a number, and a symbol.";
const PASSWORD_MISMATCH_ERROR = "Passwords do not match.";

export type PasswordValidationTarget = "password" | "confirmation";

export type PasswordValidationError = {
  target: PasswordValidationTarget;
  message: string;
};

export function getPasswordPolicyError(password: string): string | null {
  const meetsLength = password.length >= PASSWORD_MIN_LENGTH;
  const meetsCharacterRequirements = PASSWORD_REQUIREMENTS.every((pattern) =>
    pattern.test(password)
  );

  if (meetsLength && meetsCharacterRequirements) return null;

  return PASSWORD_POLICY_ERROR;
}

export function getNewPasswordError(
  password: string,
  confirmation: string,
): PasswordValidationError | null {
  const policyError = getPasswordPolicyError(password);
  if (policyError) return { target: "password", message: policyError };
  if (password !== confirmation) {
    return { target: "confirmation", message: PASSWORD_MISMATCH_ERROR };
  }

  return null;
}
