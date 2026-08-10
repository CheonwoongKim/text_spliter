export const PASSWORD_MIN_LENGTH = 8;

/**
 * Read only on the authentication screens, which are written in English while
 * the rest of the product is Korean. See docs/DESIGN_SYSTEM.md.
 */
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

export function getPasswordPolicyError(password: string): string | null {
  const meetsLength = password.length >= PASSWORD_MIN_LENGTH;
  const meetsCharacterRequirements = PASSWORD_REQUIREMENTS.every((pattern) =>
    pattern.test(password)
  );

  if (meetsLength && meetsCharacterRequirements) return null;

  return PASSWORD_POLICY_ERROR;
}
