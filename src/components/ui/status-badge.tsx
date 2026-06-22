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
  tone?: StatusTone;
};

export function StatusBadge({ children, className, tone = "neutral", ...props }: StatusBadgeProps) {
  return (
    <span className={cn("bubli-status", tone !== "neutral" && `bubli-status--${tone}`, className)} {...props}>
      {children}
    </span>
  );
}
