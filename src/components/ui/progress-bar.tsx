import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ProgressBarProps = HTMLAttributes<HTMLDivElement> & {
  label?: string;
  value: number;
};

export function ProgressBar({ className, label, value, ...props }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={safeValue}
      className={cn("bubli-progress", className)}
      role="progressbar"
      {...props}
    >
      <div className="bubli-progress__bar" style={{ width: `${safeValue}%` }} />
    </div>
  );
}
