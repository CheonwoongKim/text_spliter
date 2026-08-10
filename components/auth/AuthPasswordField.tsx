"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { AuthFieldLabel } from "@/components/auth/AuthField";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/FormFields";

interface AuthPasswordFieldProps {
  id: string;
  name: "password" | "passwordConfirmation";
  label: string;
  placeholder: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  hint?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  invalid?: boolean;
  feedbackId?: string;
}

export function AuthPasswordField({
  id,
  name,
  label,
  placeholder,
  autoComplete,
  minLength,
  hint,
  inputRef,
  invalid = false,
  feedbackId,
}: AuthPasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [hintId, invalid && feedbackId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <AuthFieldLabel htmlFor={id}>{label}</AuthFieldLabel>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          placeholder={placeholder}
          fieldSize="xl"
          borderTone="default"
          className="bg-card pr-12"
          autoComplete={autoComplete}
          minLength={minLength}
          error={invalid}
          aria-describedby={describedBy}
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={`${isVisible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={isVisible}
          className="absolute inset-y-0 right-2 my-auto"
        >
          {isVisible ? (
            <EyeOff className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          )}
        </Button>
      </div>
      {hint && (
        <p id={hintId} className="mt-2 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
