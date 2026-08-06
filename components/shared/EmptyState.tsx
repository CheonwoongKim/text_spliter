import React from "react";
import { Button, ButtonProps } from "./Button";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps["variant"];
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = "",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-xl bg-card/50 ${className}`}>
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h4 className="text-sm font-semibold text-card-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1.5 max-w-sm text-pretty">{description}</p>
      {action && (
        <Button variant={action.variant || "primary"} size="sm" onClick={action.onClick} className="mt-5">
          {action.label}
        </Button>
      )}
    </div>
  );
};
