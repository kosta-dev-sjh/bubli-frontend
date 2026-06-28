import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type StatusTone =
  | "neutral"
  | "todo"
  | "agent"
  | "communication"
  | "timer"
  | "memo"
  | "warning"
  | "success"
  | "pending"
  | "approved"
  | "room"
  | "personal";

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  disabled?: boolean;
  selected?: boolean;
  tone?: StatusTone;
};

export function StatusBadge({
  children,
  className,
  disabled = false,
  selected = false,
  tone = "neutral",
  ...props
}: StatusBadgeProps) {
  return (
    <span
      aria-disabled={disabled || undefined}
      className={cn(
        "bubli-status",
        tone !== "neutral" && `bubli-status--${tone}`,
        selected && "bubli-status--selected",
        disabled && "bubli-status--disabled",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
