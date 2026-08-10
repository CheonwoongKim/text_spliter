import React, { forwardRef, useId } from "react";

type FormControlProps = {
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
};

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children?: React.ReactElement<FormControlProps>;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  error,
  hint,
  required,
  className = "",
  children,
}) => {
  const generatedId = useId();
  const control = React.isValidElement<FormControlProps>(children) ? children : null;
  const fieldId = htmlFor || control?.props.id || generatedId;
  const messageId = error
    ? `${generatedId}-error`
    : hint
      ? `${generatedId}-hint`
      : undefined;
  const describedBy = [control?.props["aria-describedby"], messageId]
    .filter(Boolean)
    .join(" ") || undefined;

  const controlWithAccessibility = control
    ? React.cloneElement(control, {
        id: fieldId,
        required: required || control.props.required || undefined,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : control.props["aria-invalid"],
      })
    : children;

  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      {label && (
        <label htmlFor={fieldId} className="text-xs font-medium text-muted-foreground flex items-center justify-between">
          <span>
            {label}
            {required && <span aria-hidden="true" className="text-danger ml-1">*</span>}
          </span>
        </label>
      )}
      {controlWithAccessibility}
      {hint && !error && <p id={messageId} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={messageId} role="alert" className="text-xs text-danger font-medium">{error}</p>}
    </div>
  );
};

function hasInvalidState(
  error: boolean,
  ariaInvalid: React.AriaAttributes["aria-invalid"],
) {
  return error || (
    ariaInvalid !== undefined &&
    ariaInvalid !== false &&
    ariaInvalid !== "false"
  );
}

/**
 * Fields share the control scale with Button so a field and the button beside
 * it line up. Before this, buttons stood 36px and most fields 40px, which is
 * only visible when they sit on the same row — which is where they always sit.
 */
export type ControlSize = "sm" | "md" | "lg" | "xl";

export const controlHeights: Record<ControlSize, string> = {
  sm: "h-control-sm",
  md: "h-control-md",
  lg: "h-control-lg",
  xl: "h-control-xl",
};

/** The corner follows the control's height: a 48px field carries a rounder one. */
export const controlRadii: Record<ControlSize, string> = {
  sm: "rounded-lg",
  md: "rounded-lg",
  lg: "rounded-lg",
  xl: "rounded-2xl",
};

/**
 * A value inside a field reads larger than the same text on the page, so each
 * size drops one step. `xl` belongs to a standalone entry screen, whose text
 * sits at 15px; the rest sit under the 13px of a workspace.
 */
export const controlTextSizes: Record<ControlSize, string> = {
  sm: "text-control-sm",
  md: "text-control-sm",
  lg: "text-control-sm",
  xl: "text-control-md",
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  fieldSize?: ControlSize;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, fieldSize = "md", className = "", "aria-invalid": ariaInvalid, ...props }, ref) => {
    const invalid = hasInvalidState(error, ariaInvalid);
    return (
      <input
        ref={ref}
        aria-invalid={error ? true : ariaInvalid}
        className={`w-full ${controlHeights[fieldSize]} px-3 border ${controlRadii[fieldSize]} bg-surface ${controlTextSizes[fieldSize]} text-card-foreground placeholder-light focus-ring disabled:opacity-disabled disabled:cursor-not-allowed ${
          invalid ? "border-danger focus:border-danger" : "border-control"
        } ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  fieldSize?: ControlSize;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error = false, fieldSize = "md", className = "", children, "aria-invalid": ariaInvalid, ...props }, ref) => {
    const invalid = hasInvalidState(error, ariaInvalid);
    return (
      <select
        ref={ref}
        aria-invalid={error ? true : ariaInvalid}
        className={`w-full ${controlHeights[fieldSize]} px-3 border ${controlRadii[fieldSize]} bg-surface ${controlTextSizes[fieldSize]} text-card-foreground focus-ring disabled:opacity-disabled disabled:cursor-not-allowed ${
          invalid ? "border-danger focus:border-danger" : "border-control"
        } ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error = false, className = "", "aria-invalid": ariaInvalid, ...props }, ref) => {
    const invalid = hasInvalidState(error, ariaInvalid);
    return (
      <textarea
        ref={ref}
        aria-invalid={error ? true : ariaInvalid}
        className={`w-full px-3 py-2 border rounded-lg bg-surface ${controlTextSizes.md} text-card-foreground placeholder-light focus-ring disabled:opacity-disabled disabled:cursor-not-allowed ${
          invalid ? "border-danger focus:border-danger" : "border-control"
        } ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
