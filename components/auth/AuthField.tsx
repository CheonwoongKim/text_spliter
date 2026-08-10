import type { Ref } from "react";
import { Input } from "@/components/shared/FormFields";

interface AuthFieldLabelProps {
  htmlFor: string;
  children: React.ReactNode;
}

interface AuthEmailFieldProps {
  id: string;
  inputRef?: Ref<HTMLInputElement>;
}

export function AuthFieldLabel({ htmlFor, children }: AuthFieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-xs font-normal text-surface-foreground"
    >
      {children}
    </label>
  );
}

export function AuthEmailField({ id, inputRef }: AuthEmailFieldProps) {
  return (
    <div>
      <AuthFieldLabel htmlFor={id}>Email</AuthFieldLabel>
      <Input
        ref={inputRef}
        id={id}
        name="email"
        type="email"
        placeholder="ex: example@email.com"
        fieldSize="xl"
        borderTone="default"
        className="bg-card"
        autoComplete="email"
        required
      />
    </div>
  );
}
