import React from "react";
import ModalDialog from "./ModalDialog";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl rounded-lg",
  xl: "max-w-4xl rounded-lg",
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
  if (!isOpen) return null;

  return (
    <ModalDialog
      title={title}
      description={description}
      onClose={onClose}
      panelClassName={`${sizeStyles[size]} max-h-[90vh] overflow-hidden rounded-lg shadow-lg`}
    >
      <div className="flex-1 overflow-y-auto p-6 space-y-4">{children}</div>
      {footer && (
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-subtle bg-subtle">
          {footer}
        </div>
      )}
    </ModalDialog>
  );
};

export default Modal;
