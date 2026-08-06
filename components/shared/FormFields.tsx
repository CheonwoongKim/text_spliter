import React, { forwardRef } from "react";

export interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  hint,
  required,
  className = "",
  children,
}) => {
  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
          <span>
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </span>
        </label>
      )}
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
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
        className={`w-full h-10 px-3 border rounded-lg bg-surface text-sm text-card-foreground placeholder-light focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60 transition-smooth ${
          error ? "border-red-500 focus:ring-red-500" : "border-border"
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
        className={`w-full h-10 px-3 border rounded-lg bg-surface text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60 transition-smooth ${
          error ? "border-red-500 focus:ring-red-500" : "border-border"
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
        className={`w-full px-3 py-2.5 border rounded-lg bg-surface text-sm text-card-foreground placeholder-light focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60 transition-smooth ${
          error ? "border-red-500 focus:ring-red-500" : "border-border"
        } ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
