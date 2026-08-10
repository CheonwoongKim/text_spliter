"use client";

import { Check } from "lucide-react";
import { forwardRef, useId } from "react";

/**
 * The one checkbox in the product.
 *
 * It used to be hand-rolled per screen at 16px with an 8px radius, which is
 * half its own width — at that ratio a square reads as a circle, and a circle
 * reads as a radio button, which means "pick one of these" rather than "this
 * is on". 20px with a 4px radius keeps it square, keeps the corner visible as
 * a corner, and gives the tick room to be seen rather than guessed at.
 *
 * The whole row is the target, not just the box: the label is inside the
 * `<label>`, so a person can hit a 20px box or the words next to it.
 */

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  /** The words beside the box. They are part of the target. */
  label: React.ReactNode;
  borderTone?: "default" | "control";
}

const checkboxBorderClasses: Record<NonNullable<CheckboxProps["borderTone"]>, string> = {
  default: "border-border",
  control: "border-control",
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, borderTone = "control", className = "", id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <label
        htmlFor={inputId}
        className={`flex w-fit items-center gap-2 text-xs font-normal text-muted-foreground ${
          disabled ? "cursor-not-allowed opacity-disabled" : "cursor-pointer"
        } ${className}`}
      >
        <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            disabled={disabled}
            className={`peer h-5 w-5 appearance-none rounded-sm border ${checkboxBorderClasses[borderTone]} bg-card
                        checked:border-surface-foreground checked:bg-surface-foreground
                        focus:outline-none focus-visible:border-surface-foreground
                        disabled:cursor-not-allowed`}
            {...props}
          />
          {/* Drawn over the input rather than inside it: a checkbox cannot hold
              a child, and `appearance-none` leaves nothing to style. */}
          <Check
            className="pointer-events-none absolute h-4 w-4 text-card opacity-0 peer-checked:opacity-100"
            strokeWidth={2}
            aria-hidden="true"
          />
        </span>
        {label}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
