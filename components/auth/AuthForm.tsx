"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthEmailField } from "@/components/auth/AuthField";
import { AuthFeedback, type AuthFeedbackMessage } from "@/components/auth/AuthFeedback";
import { AuthPage, AuthPageLink } from "@/components/auth/AuthPage";
import { AuthPasswordField } from "@/components/auth/AuthPasswordField";
import { Button } from "@/components/shared/Button";
import { Checkbox } from "@/components/shared/Checkbox";
import {
  getRememberedEmail,
  saveRememberedEmail,
  syncAuthSession,
} from "@/lib/auth";
import {
  getSafeAuthErrorMessage,
  isExistingAccountError,
} from "@/lib/auth-feedback";
import {
  getNewPasswordError,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENT_TEXT,
  type PasswordValidationTarget,
} from "@/lib/password-policy";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type AuthMode = "signin" | "signup";

interface AuthFormProps {
  mode: AuthMode;
  getSupabase?: typeof getBrowserSupabase;
  onAuthenticated?: () => void;
}

const AUTH_CONTENT = {
  signin: {
    title: "Welcome back",
    submit: "Sign in",
    pending: "Signing in...",
    link: "No account yet? Sign up",
    href: "/signup",
  },
  signup: {
    title: "Create your account",
    submit: "Sign up",
    pending: "Creating account...",
    link: "Already have an account? Sign in",
    href: "/login",
  },
} as const;

const SIGNUP_CONFIRMATION: AuthFeedbackMessage = {
  type: "success",
  text: "Check your inbox to confirm your address, then sign in.",
};

export default function AuthForm({
  mode,
  getSupabase = getBrowserSupabase,
  onAuthenticated = () => window.location.replace("/"),
}: AuthFormProps) {
  const isSignup = mode === "signup";
  const content = AUTH_CONTENT[mode];
  const fieldPrefix = `auth-${mode}`;
  const feedbackId = `${fieldPrefix}-feedback`;
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmationInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedbackMessage | null>(null);
  const [invalidField, setInvalidField] = useState<PasswordValidationTarget | null>(null);
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
    setInvalidField(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!isSignup) {
      saveRememberedEmail(shouldRememberEmail ? email : null);
    }

    if (isSignup) {
      const confirmation = String(formData.get("passwordConfirmation") ?? "");
      const validationError = getNewPasswordError(password, confirmation);
      if (validationError) {
        setFeedback({ type: "error", text: validationError.message });
        setInvalidField(validationError.target);
        const invalidInput = validationError.target === "password"
          ? passwordInputRef
          : confirmationInputRef;
        invalidInput.current?.focus();
        return;
      }
    }

    setLoading(true);

    try {
      const auth = getSupabase().auth;
      const credentials = { email, password };
      const { data, error } = isSignup
        ? await auth.signUp(credentials)
        : await auth.signInWithPassword(credentials);

      if (error) throw error;

      if (data.session) {
        syncAuthSession(data.session);
        onAuthenticated();
        return;
      }

      setFeedback(
        isSignup
          ? SIGNUP_CONFIRMATION
          : {
              type: "error",
              text: "Could not start a session. Please try again.",
            }
      );
    } catch (error) {
      if (isSignup && isExistingAccountError(error)) {
        setFeedback(SIGNUP_CONFIRMATION);
      } else {
        setFeedback({
          type: "error",
          text: getSafeAuthErrorMessage(mode, error),
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPage title={content.title}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <AuthEmailField id={`${fieldPrefix}-email`} inputRef={emailInputRef} />

          <AuthPasswordField
            inputRef={passwordInputRef}
            id={`${fieldPrefix}-password`}
            name="password"
            label="Password"
            placeholder={isSignup ? "Create a password" : "Enter your password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={isSignup ? PASSWORD_MIN_LENGTH : undefined}
            hint={isSignup ? PASSWORD_REQUIREMENT_TEXT : undefined}
            invalid={invalidField === "password"}
            feedbackId={feedbackId}
          />

          {isSignup && (
            <AuthPasswordField
              inputRef={confirmationInputRef}
              id={`${fieldPrefix}-password-confirmation`}
              name="passwordConfirmation"
              label="Confirm password"
              placeholder="Repeat password"
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              invalid={invalidField === "confirmation"}
              feedbackId={feedbackId}
            />
          )}
        </div>

        {!isSignup && (
          <div className="mt-4 flex items-center justify-between gap-4">
            <Checkbox
              borderTone="default"
              checked={shouldRememberEmail}
              onChange={handleRememberEmailChange}
              label="Remember email"
            />
            <Link
              href="/forgot-password"
              prefetch={false}
              className="text-xs text-muted-foreground transition-smooth hover:text-card-foreground"
            >
              Forgot password?
            </Link>
          </div>
        )}

        <div className="mt-8 space-y-4">
          <AuthFeedback id={feedbackId} feedback={feedback} />

          <Button type="submit" size="xl" variant="neutral" isLoading={loading}>
            {loading ? content.pending : content.submit}
          </Button>
        </div>

        <AuthPageLink href={content.href}>
          {content.link}
        </AuthPageLink>
      </form>
    </AuthPage>
  );
}
