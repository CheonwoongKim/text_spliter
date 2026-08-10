import { LoaderCircle } from "lucide-react";
import React, { forwardRef } from "react";

/**
 * Every button in the workbench.
 *
 * The variants cover what the screens actually needed, which is why
 * `dangerGhost` and the `icon` size exist: a feature had grown its own style
 * constants for exactly those two shapes, and a primitive that cannot express
 * them just gets bypassed again.
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "dangerGhost"
  | "danger"
  | "neutral"
  | "soft";
export type ButtonSize = "sm" | "md" | "lg" | "xl" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-surface-foreground text-surface hover:opacity-hover focus-visible:ring-surface-foreground",
  secondary: "bg-subtle text-card-foreground border border-border hover:bg-muted focus-visible:ring-surface-foreground",
  outline: "border border-border text-card-foreground hover:border-border-darkest hover:bg-muted focus-visible:ring-surface-foreground",
  ghost: "text-muted-foreground hover:text-card-foreground hover:bg-muted focus-visible:ring-surface-foreground",
  dangerGhost: "text-muted-foreground hover:text-danger hover:bg-danger-surface focus-visible:ring-danger",
  danger: "bg-danger-surface text-danger border border-danger-border hover:bg-danger-action hover:text-danger-action-foreground focus-visible:ring-danger",
  neutral: "bg-border-darkest text-card-foreground hover:bg-border-control focus-visible:ring-surface-foreground",
  soft: "bg-upload-zone text-card-foreground hover:bg-muted focus-visible:ring-surface-foreground",
};

/**
 * A label inside a button reads larger than the same words on the page, so
 * each size drops one step: `control-sm` under a 13px workspace, `control-md`
 * under the 15px of a standalone entry screen. `xl` is that entry-screen size,
 * where the button is the single thing the screen asks for.
 */
const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-control-sm px-3 text-control-sm gap-1 rounded-lg",
  md: "h-control-md px-4 text-control-sm gap-2 rounded-lg",
  lg: "h-control-lg px-6 text-control-sm gap-3 rounded-lg",
  xl: "h-control-xl w-full px-6 text-control-md gap-2 rounded-2xl",
  icon: "h-8 w-8 text-control-sm rounded-lg",
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
        aria-busy={isLoading || undefined}
        className={`inline-flex items-center justify-center font-medium transition-smooth focus:outline-none focus-visible:ring-1 disabled:opacity-disabled disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.5} aria-hidden="true" />
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

export default Button;
