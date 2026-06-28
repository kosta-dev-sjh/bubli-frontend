import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "quiet" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "bubli-button--primary",
  secondary: "",
  quiet: "bubli-button--quiet",
  ghost: "bubli-button--ghost",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "bubli-button--sm",
  md: "",
  lg: "bubli-button--lg",
};

export function Button({
  children,
  className,
  disabled,
  icon,
  loading = false,
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      aria-busy={loading || undefined}
      className={cn("bubli-button", variantClass[variant], sizeClass[size], className)}
      disabled={disabled || loading}
      type={type}
      {...props}
    >
      {loading ? (
        <span className="bubli-button__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      ) : (
        <>
          {icon ? <span aria-hidden="true">{icon}</span> : null}
          {children}
        </>
      )}
    </button>
  );
}
