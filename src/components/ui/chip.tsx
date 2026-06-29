import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  disabled?: boolean;
  icon?: ReactNode;
  selected?: boolean;
};

export function Chip({ children, className, disabled = false, icon, selected = false, ...props }: ChipProps) {
  return (
    <span
      aria-disabled={disabled || undefined}
      className={cn(
        "bubli-chip",
        selected && "bubli-chip--selected",
        disabled && "bubli-chip--disabled",
        className,
      )}
      {...props}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}
