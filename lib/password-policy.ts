export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REQUIREMENT_TEXT =
  "영문 대·소문자, 숫자, 특수문자 포함 8자리 이상 입력";

const PASSWORD_REQUIREMENTS = [
  /[a-z]/,
  /[A-Z]/,
  /[0-9]/,
  /[\p{P}\p{S}]/u,
] as const;

const PASSWORD_POLICY_ERROR =
  "비밀번호는 8자리 이상이며 영문 대·소문자, 숫자, 특수문자를 모두 포함해야 합니다.";

export function getPasswordPolicyError(password: string): string | null {
  const meetsLength = password.length >= PASSWORD_MIN_LENGTH;
  const meetsCharacterRequirements = PASSWORD_REQUIREMENTS.every((pattern) =>
    pattern.test(password)
  );

  if (meetsLength && meetsCharacterRequirements) return null;

  return PASSWORD_POLICY_ERROR;
}
