import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  icon?: ReactNode;
  selected?: boolean;
};

export function Chip({ children, className, icon, selected = false, ...props }: ChipProps) {
  return (
    <span className={cn("bubli-chip", selected && "bubli-chip--selected", className)} {...props}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}
