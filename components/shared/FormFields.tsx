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

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, className = "", "aria-invalid": ariaInvalid, ...props }, ref) => {
    const invalid = hasInvalidState(error, ariaInvalid);
    return (
      <input
        ref={ref}
        aria-invalid={error ? true : ariaInvalid}
        className={`w-full h-control-md px-3 border rounded-lg bg-surface text-base text-card-foreground placeholder-light focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-disabled disabled:cursor-not-allowed transition-smooth ${
          invalid ? "border-danger focus:ring-danger" : "border-border"
        } ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error = false, className = "", children, "aria-invalid": ariaInvalid, ...props }, ref) => {
    const invalid = hasInvalidState(error, ariaInvalid);
    return (
      <select
        ref={ref}
        aria-invalid={error ? true : ariaInvalid}
        className={`w-full h-control-md px-3 border rounded-lg bg-surface text-base text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-disabled disabled:cursor-not-allowed transition-smooth ${
          invalid ? "border-danger focus:ring-danger" : "border-border"
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
        className={`w-full px-3 py-2 border rounded-lg bg-surface text-base text-card-foreground placeholder-light focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-disabled disabled:cursor-not-allowed transition-smooth ${
          invalid ? "border-danger focus:ring-danger" : "border-border"
        } ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
