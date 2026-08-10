"use client";

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { memo, type ReactNode } from "react";

/**
 * The inline result of an action: saved, failed, or worth a warning.
 *
 * Screens each wrote their own success/error box, so the same outcome appeared
 * in different colours and without an icon on some screens. An icon matters
 * because colour alone does not carry the outcome for every reader, and an
 * error is announced so it is not missed by someone who has moved focus away.
 */

export type StatusTone = "success" | "danger" | "warning" | "info";

const TONES: Record<StatusTone, { className: string; Icon: typeof Info }> = {
  success: {
    className: "bg-success-surface text-success border-success-border",
    Icon: CheckCircle2,
  },
  danger: {
    className: "bg-danger-surface text-danger border-danger-border",
    Icon: XCircle,
  },
  warning: {
    className: "bg-warning-surface text-warning border-warning-border",
    Icon: AlertTriangle,
  },
  info: {
    className: "bg-muted text-muted-foreground border-border",
    Icon: Info,
  },
};

interface StatusMessageProps {
  tone: StatusTone;
  children: ReactNode;
  /** Extra detail shown under the message, such as a provider error string. */
  details?: ReactNode;
  className?: string;
}

function StatusMessage({ tone, children, details, className = "" }: StatusMessageProps) {
  const { className: toneClass, Icon } = TONES[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${toneClass} ${className}`}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      <div className="min-w-0">
        <p>{children}</p>
        {details && <p className="mt-1 break-words opacity-hover">{details}</p>}
      </div>
    </div>
  );
}

export default memo(StatusMessage);
