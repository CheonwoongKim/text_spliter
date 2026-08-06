import React, { useEffect } from "react";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = "lg",
  children,
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div
        className={`w-full ${sizeStyles[size]} max-h-[90vh] flex flex-col bg-card border border-border rounded-xl shadow-2xl overflow-hidden`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
            {description && <p className="text-xs text-muted-foreground mt-1 text-pretty">{description}</p>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-8 h-8 p-0 rounded-full text-muted-foreground hover:text-card-foreground"
            aria-label="Close modal"
          >
            ✕
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">{children}</div>

        {footer && <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-subtle/50">{footer}</div>}
      </div>
    </div>
  );
};
