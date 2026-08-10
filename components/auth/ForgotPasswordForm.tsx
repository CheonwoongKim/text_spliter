"use client";

import { useState } from "react";
import { AuthEmailField } from "@/components/auth/AuthField";
import { AuthFeedback, type AuthFeedbackMessage } from "@/components/auth/AuthFeedback";
import { AuthPage, AuthPageLink } from "@/components/auth/AuthPage";
import { Button } from "@/components/shared/Button";
import {
  getSafeAuthErrorMessage,
  isPrivatePasswordResetError,
} from "@/lib/auth-feedback";
import { getBrowserSupabase } from "@/lib/supabase-browser";

const RESET_REQUESTED_MESSAGE =
  "If an account exists for this email, a password reset link has been sent.";

interface ForgotPasswordFormProps {
  getSupabase?: typeof getBrowserSupabase;
}

export default function ForgotPasswordForm({
  getSupabase = getBrowserSupabase,
}: ForgotPasswordFormProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedbackMessage | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setFeedback(null);
    setLoading(true);

    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error && !isPrivatePasswordResetError(error)) throw error;

      setFeedback({ type: "success", text: RESET_REQUESTED_MESSAGE });
    } catch (error) {
      setFeedback({
        type: "error",
        text: getSafeAuthErrorMessage("request-reset", error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPage title="Reset your password">
      <form onSubmit={handleSubmit}>
        <AuthEmailField id="forgot-password-email" />
        <AuthFeedback feedback={feedback} className="mt-4" />

        <Button type="submit" size="xl" variant="neutral" className="mt-8" isLoading={loading}>
          {loading ? "Sending reset link..." : "Send reset link"}
        </Button>

        <AuthPageLink href="/login">
          Back to sign in
        </AuthPageLink>
      </form>
    </AuthPage>
  );
}
