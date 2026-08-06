import React, { forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "soft";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground hover:opacity-hover focus-visible:ring-accent",
  secondary: "bg-subtle text-card-foreground border border-border hover:bg-muted focus-visible:ring-accent",
  outline: "border border-border text-muted-foreground hover:text-card-foreground hover:bg-muted focus-visible:ring-accent",
  ghost: "text-muted-foreground hover:text-card-foreground hover:bg-muted focus-visible:ring-accent",
  danger: "bg-danger-surface text-danger border border-danger-border hover:bg-danger-action hover:text-danger-action-foreground focus-visible:ring-danger",
  soft: "bg-accent/10 text-accent hover:bg-accent/20 focus-visible:ring-accent",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-control-sm px-3 text-xs gap-1 rounded-sm",
  md: "h-control-md px-4 text-base gap-2 rounded-lg",
  lg: "h-control-lg px-6 text-lg gap-3 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = "",
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-medium transition-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-disabled disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
