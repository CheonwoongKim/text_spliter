import React from "react";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent" | "outline";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-subtle text-muted-foreground border border-border",
  success: "bg-success-surface text-success border border-success-border",
  warning: "bg-warning-surface text-warning border border-warning-border",
  danger: "bg-danger-surface text-danger border border-danger-border",
  accent: "bg-accent/10 text-accent border border-accent/20",
  outline: "border border-border text-card-foreground",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  accent: "bg-accent",
  outline: "bg-card-foreground",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1 text-xs font-medium",
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  size = "md",
  dot = false,
  className = "",
  children,
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};
