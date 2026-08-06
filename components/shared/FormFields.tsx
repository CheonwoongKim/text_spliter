import React, { forwardRef, useId } from "react";

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children?: React.ReactNode;
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
  const fieldId = htmlFor || generatedId;

  // Clone children if single React element to inject id if not present
  const childrenWithId = React.isValidElement<{ id?: string }>(children)
    ? React.cloneElement(children, {
        id: children.props.id || fieldId,
        ...(error ? { error: true } : {}),
      })
    : children;

  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      {label && (
        <label htmlFor={fieldId} className="text-xs font-medium text-muted-foreground flex items-center justify-between">
          <span>
            {label}
            {required && <span className="text-danger ml-1">*</span>}
          </span>
        </label>
      )}
      {childrenWithId}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-danger font-medium">{error}</p>}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full h-control-md px-3 border rounded-lg bg-surface text-base text-card-foreground placeholder-light focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-disabled disabled:cursor-not-allowed transition-smooth ${
          error ? "border-danger focus:ring-danger" : "border-border"
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
  ({ error = false, className = "", children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full h-control-md px-3 border rounded-lg bg-surface text-base text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-disabled disabled:cursor-not-allowed transition-smooth ${
          error ? "border-danger focus:ring-danger" : "border-border"
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
  ({ error = false, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full px-3 py-2 border rounded-lg bg-surface text-base text-card-foreground placeholder-light focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-disabled disabled:cursor-not-allowed transition-smooth ${
          error ? "border-danger focus:ring-danger" : "border-border"
        } ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
