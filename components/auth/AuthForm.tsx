"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/shared/Button";
import { Checkbox } from "@/components/shared/Checkbox";
import { Input } from "@/components/shared/FormFields";
import {
  getRememberedEmail,
  saveRememberedEmail,
  syncAuthSession,
} from "@/lib/auth";
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
    title: "Welcome back",
    submit: "Sign in",
    pending: "Signing in...",
    link: "No account yet? Sign up",
    href: "/signup",
    passwordAutoComplete: "current-password",
    passwordMinLength: 6,
  },
  signup: {
    title: "Create your account",
    submit: "Sign up",
    pending: "Creating account...",
    link: "Already have an account? Sign in",
    href: "/login",
    passwordAutoComplete: "new-password",
    passwordMinLength: PASSWORD_MIN_LENGTH,
  },
} as const;

/**
 * Every field here is the shared control at its entry-screen size.
 *
 * `bg-card` rather than the shared default: a workspace field sits inside a
 * `bg-card` panel and is recessed against it, but this screen has no panel, so
 * a field on the canvas has to be raised off it instead or it disappears into
 * the page and leaves only its border behind.
 */
const FIELD_SIZE = "xl" as const;
const FIELD_SURFACE = "bg-card";

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
      <label htmlFor={id} className="mb-2 block text-xs font-normal text-surface-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          placeholder={placeholder}
          fieldSize={FIELD_SIZE}
          borderTone="default"
          className={`${FIELD_SURFACE} pr-12`}
          autoComplete={autoComplete}
          minLength={minLength}
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={`${isVisible ? "Hide" : "Show"} ${visibilityLabel.toLowerCase()}`}
          aria-pressed={isVisible}
          className="absolute inset-y-0 right-2 my-auto"
        >
          <PasswordVisibilityIcon visible={isVisible} />
        </Button>
      </div>
    </div>
  );
}

export default function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === "signup";
  const content = AUTH_CONTENT[mode];
  const fieldPrefix = `auth-${mode}`;
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [shouldRememberEmail, setShouldRememberEmail] = useState(false);

  useEffect(() => {
    if (isSignup) return;

    const rememberedEmail = getRememberedEmail();
    if (!rememberedEmail || !emailInputRef.current) return;

    emailInputRef.current.value = rememberedEmail;
    setShouldRememberEmail(true);
  }, [isSignup]);

  function handleRememberEmailChange(event: React.ChangeEvent<HTMLInputElement>) {
    const isChecked = event.target.checked;
    setShouldRememberEmail(isChecked);
    saveRememberedEmail(isChecked ? emailInputRef.current?.value ?? null : null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setFeedback(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!isSignup) {
      saveRememberedEmail(shouldRememberEmail ? email : null);
    }

    if (isSignup) {
      const policyError = getPasswordPolicyError(password);
      if (policyError) {
        setFeedback({ type: "error", text: policyError });
        return;
      }

      const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
      if (password !== passwordConfirmation) {
        setFeedback({ type: "error", text: "Passwords do not match." });
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
              text: "Check your inbox to confirm your address, then sign in.",
            }
          : {
              type: "error",
              text: "Could not start a session. Please try again.",
            }
      );
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Authentication failed.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-auth">
        <header className="text-center mb-10">
          <h1 className="text-2xl font-semibold text-card-foreground">
            {content.title}
          </h1>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div>
              <label htmlFor={`${fieldPrefix}-email`} className="mb-2 block text-xs font-normal text-surface-foreground">
                Email
              </label>
              <Input
                ref={emailInputRef}
                id={`${fieldPrefix}-email`}
                name="email"
                type="email"
                placeholder="ex: example@email.com"
                fieldSize={FIELD_SIZE}
                borderTone="default"
                className={FIELD_SURFACE}
                autoComplete="email"
                required
              />
            </div>

            <PasswordField
              id={`${fieldPrefix}-password`}
              name="password"
              label="Password"
              visibilityLabel="Password"
              placeholder={PASSWORD_REQUIREMENT_TEXT}
              autoComplete={content.passwordAutoComplete}
              minLength={content.passwordMinLength}
            />

            {isSignup && (
              <PasswordField
                id={`${fieldPrefix}-password-confirmation`}
                name="passwordConfirmation"
                label="Confirm password"
                visibilityLabel="Password confirmation"
                placeholder="Repeat password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
              />
            )}
          </div>

          {!isSignup && (
            <Checkbox
              className="mt-4"
              borderTone="default"
              checked={shouldRememberEmail}
              onChange={handleRememberEmailChange}
              label="Remember email"
            />
          )}

          <div className="mt-8 space-y-4">
            {feedback && (
              <p
                className={`text-base ${feedback.type === "error" ? "text-danger" : "text-success"}`}
                role={feedback.type === "error" ? "alert" : "status"}
              >
                {feedback.text}
              </p>
            )}

            <Button type="submit" size="xl" isLoading={loading}>
              {loading ? content.pending : content.submit}
            </Button>
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
