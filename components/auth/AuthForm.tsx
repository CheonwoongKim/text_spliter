"use client";

import Link from "next/link";
import { useState } from "react";
import { syncAuthSession } from "@/lib/auth";
import {
  getPasswordPolicyError,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENT_TEXT,
} from "@/lib/password-policy";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type AuthMode = "signin" | "signup";

interface AuthFormProps {
  mode: AuthMode;
}

interface PasswordFieldProps {
  id: string;
  name: "password" | "passwordConfirmation";
  label: string;
  visibilityLabel: string;
  placeholder: string;
  autoComplete: "current-password" | "new-password";
  minLength: number;
}

type Feedback = {
  type: "error" | "success";
  text: string;
};

const AUTH_CONTENT = {
  signin: {
    title: "Welcom, Back!",
    submit: "로그인",
    pending: "로그인 중...",
    link: "계정이 없나요? 회원가입",
    href: "/signup",
    passwordAutoComplete: "current-password",
    passwordMinLength: 6,
  },
  signup: {
    title: "Sign Up",
    submit: "계정 생성",
    pending: "계정 생성 중...",
    link: "이미 계정이 있나요? 로그인",
    href: "/login",
    passwordAutoComplete: "new-password",
    passwordMinLength: PASSWORD_MIN_LENGTH,
  },
} as const;

const FIELD_CLASS =
  "h-control-xl w-full rounded-2xl border border-border bg-card text-xs text-card-foreground placeholder-light focus-ring";

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      className="mx-auto h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {visible ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3l18 18M10.6 10.6A2 2 0 0013.4 13.4M9.9 5.3A10.7 10.7 0 0112 5c6 0 9.75 7 9.75 7a17.8 17.8 0 01-2.3 3.3M6.2 6.2C3.7 8 2.25 12 2.25 12S6 19 12 19a10.4 10.4 0 004.2-.9"
        />
      ) : (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12S6 5 12 5s9.75 7 9.75 7S18 19 12 19 2.25 12 2.25 12z"
          />
          <circle cx="12" cy="12" r="2.5" />
        </>
      )}
    </svg>
  );
}

function PasswordField({
  id,
  name,
  label,
  visibilityLabel,
  placeholder,
  autoComplete,
  minLength,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-2xs font-normal text-surface-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          placeholder={placeholder}
          className={`${FIELD_CLASS} pl-4 pr-12`}
          autoComplete={autoComplete}
          minLength={minLength}
          required
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={`${visibilityLabel} ${isVisible ? "숨기기" : "보기"}`}
          aria-pressed={isVisible}
          className="absolute inset-y-0 right-2 my-auto h-control-md w-control-md rounded-lg
                   border border-transparent text-muted-foreground hover:bg-muted hover:text-card-foreground
                   focus-visible:outline-none focus-visible:border-surface-foreground"
        >
          <PasswordVisibilityIcon visible={isVisible} />
        </button>
      </div>
    </div>
  );
}

export default function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup";
  const content = AUTH_CONTENT[mode];
  const fieldPrefix = `auth-${mode}`;
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setFeedback(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (isSignup) {
      const policyError = getPasswordPolicyError(password);
      if (policyError) {
        setFeedback({ type: "error", text: policyError });
        return;
      }

      const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
      if (password !== passwordConfirmation) {
        setFeedback({ type: "error", text: "비밀번호가 일치하지 않습니다." });
        return;
      }
    }

    setLoading(true);

    try {
      const auth = getBrowserSupabase().auth;
      const credentials = { email, password };
      const { data, error } = isSignup
        ? await auth.signUp(credentials)
        : await auth.signInWithPassword(credentials);

      if (error) throw error;

      if (data.session) {
        syncAuthSession(data.session);
        window.location.replace("/");
        return;
      }

      setFeedback(
        isSignup
          ? {
              type: "success",
              text: "계정 확인 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.",
            }
          : {
              type: "error",
              text: "로그인 세션을 생성하지 못했습니다. 다시 시도해 주세요.",
            }
      );
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "인증에 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-auth">
        <header className="text-center mb-10">
          <h1 className="text-2xl font-medium text-card-foreground">
            {content.title}
          </h1>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label htmlFor={`${fieldPrefix}-email`} className="mb-2 block text-2xs font-normal text-surface-foreground">
                Email
              </label>
              <input
                id={`${fieldPrefix}-email`}
                name="email"
                type="email"
                placeholder="예: name@company.com"
                className={`${FIELD_CLASS} px-4`}
                autoComplete="email"
                required
              />
            </div>

            <PasswordField
              id={`${fieldPrefix}-password`}
              name="password"
              label="Password"
              visibilityLabel="비밀번호"
              placeholder={PASSWORD_REQUIREMENT_TEXT}
              autoComplete={content.passwordAutoComplete}
              minLength={content.passwordMinLength}
            />

            {isSignup && (
              <PasswordField
                id={`${fieldPrefix}-password-confirmation`}
                name="passwordConfirmation"
                label="Password Confirm"
                visibilityLabel="비밀번호 확인"
                placeholder="동일한 비밀번호를 다시 입력"
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
              />
            )}
          </div>

          <div className="mt-8 space-y-4">
            {feedback && (
              <p
                className={`text-base ${feedback.type === "error" ? "text-danger" : "text-success"}`}
                role={feedback.type === "error" ? "alert" : "status"}
              >
                {feedback.text}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-control-xl bg-surface-foreground hover:bg-card-foreground
                       text-base text-card font-medium rounded-2xl
                       border border-surface-foreground transition-smooth
                       flex items-center justify-center gap-2
                       disabled:cursor-not-allowed disabled:opacity-disabled"
            >
              {loading ? content.pending : content.submit}
            </button>
          </div>

          <Link
            href={content.href}
            className="mt-12 block w-full text-center text-xs text-muted-foreground hover:text-card-foreground transition-smooth"
          >
            {content.link}
          </Link>
        </form>
      </div>
    </main>
  );
}
