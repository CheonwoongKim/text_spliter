"use client";

import { LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { AuthFeedback, type AuthFeedbackMessage } from "@/components/auth/AuthFeedback";
import { AuthPage, AuthPageLink } from "@/components/auth/AuthPage";
import { AuthPasswordField } from "@/components/auth/AuthPasswordField";
import { usePasswordRecoverySession } from "@/components/auth/usePasswordRecoverySession";
import { Button } from "@/components/shared/Button";
import { syncAuthSession } from "@/lib/auth";
import { getSafeAuthErrorMessage } from "@/lib/auth-feedback";
import { restoreAuthSession } from "@/lib/auth-session";
import {
  getNewPasswordError,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENT_TEXT,
  type PasswordValidationTarget,
} from "@/lib/password-policy";
import { getBrowserSupabase } from "@/lib/supabase-browser";

interface ResetPasswordFormProps {
  getSupabase?: typeof getBrowserSupabase;
  onPasswordUpdated?: () => void;
}

export default function ResetPasswordForm({
  getSupabase = getBrowserSupabase,
  onPasswordUpdated = () => window.location.replace("/"),
}: ResetPasswordFormProps) {
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const recovery = usePasswordRecoverySession(getSupabase);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedbackMessage | null>(null);
  const [invalidField, setInvalidField] = useState<PasswordValidationTarget | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("passwordConfirmation") ?? "");
    const validationError = getNewPasswordError(password, confirmation);

    setFeedback(null);
    setInvalidField(null);

    if (validationError) {
      setFeedback({ type: "error", text: validationError.message });
      setInvalidField(validationError.target);
      const invalidInput = validationError.target === "password" ? passwordRef : confirmationRef;
      invalidInput.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      syncAuthSession(await restoreAuthSession(supabase.auth));
      onPasswordUpdated();
    } catch (error) {
      setFeedback({
        type: "error",
        text: getSafeAuthErrorMessage("update-password", error),
      });
    } finally {
      setLoading(false);
    }
  }

  if (recovery.status === "checking") {
    return (
      <AuthPage title="Set a new password">
        <div
          className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
          role="status"
        >
          <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
          Checking reset link...
        </div>
      </AuthPage>
    );
  }

  if (recovery.status === "invalid") {
    return (
      <AuthPage title="Reset link unavailable">
        <p className="text-base text-danger" role="alert">
          {recovery.error ?? "This reset link is invalid or has expired."}
        </p>
        <AuthPageLink href="/forgot-password" className="mt-8">
          Request a new reset link
        </AuthPageLink>
      </AuthPage>
    );
  }

  const feedbackId = feedback ? "reset-password-feedback" : undefined;

  return (
    <AuthPage title="Set a new password">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <AuthPasswordField
            inputRef={passwordRef}
            id="reset-password"
            name="password"
            label="New password"
            placeholder="Create a password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            hint={PASSWORD_REQUIREMENT_TEXT}
            invalid={invalidField === "password"}
            feedbackId={feedbackId}
          />

          <AuthPasswordField
            inputRef={confirmationRef}
            id="reset-password-confirmation"
            name="passwordConfirmation"
            label="Confirm new password"
            placeholder="Repeat password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            invalid={invalidField === "confirmation"}
            feedbackId={feedbackId}
          />
        </div>

        <AuthFeedback id={feedbackId} feedback={feedback} className="mt-4" />

        <Button type="submit" size="xl" variant="neutral" className="mt-8" isLoading={loading}>
          {loading ? "Updating password..." : "Update password"}
        </Button>
      </form>
    </AuthPage>
  );
}
