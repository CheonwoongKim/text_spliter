import React, { forwardRef } from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  shadow?: "none" | "sm" | "md" | "lg";
}

const paddingStyles = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

const shadowStyles = {
  none: "",
  sm: "shadow-sm",
  md: "shadow",
  lg: "shadow-lg",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ interactive = false, padding = "md", shadow = "none", className = "", children, ...props }, ref) => {
    const baseClass = interactive ? "card-interactive" : "bg-card text-card-foreground border border-border rounded-xl";
    const shadowClass = shadowStyles[shadow];
    return (
      <div ref={ref} className={`${baseClass} ${paddingStyles[padding]} ${shadowClass} ${className}`} {...props}>
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={`flex flex-col space-y-1 mb-4 ${className}`} {...props}>
      {children}
    </div>
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = "", children, ...props }, ref) => (
    <h3 ref={ref} className={`text-lg font-semibold tracking-tight text-card-foreground ${className}`} {...props}>
      {children}
    </h3>
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = "", children, ...props }, ref) => (
    <p ref={ref} className={`text-xs text-muted-foreground text-pretty ${className}`} {...props}>
      {children}
    </p>
  )
);
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={`flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border ${className}`} {...props}>
      {children}
    </div>
  )
);
CardFooter.displayName = "CardFooter";
