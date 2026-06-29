import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ProgressBarProps = HTMLAttributes<HTMLDivElement> & {
  indeterminate?: boolean;
  label?: string;
  showValue?: boolean;
  value: number;
};

export function ProgressBar({
  className,
  indeterminate = false,
  label,
  showValue = false,
  value,
  ...props
}: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));
  const complete = !indeterminate && safeValue >= 100;

  const bar = (
    <div
      aria-busy={indeterminate || undefined}
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={indeterminate ? undefined : safeValue}
      className={cn(
        "bubli-progress",
        indeterminate && "bubli-progress--indeterminate",
        complete && "bubli-progress--complete",
        !showValue && className,
      )}
      role="progressbar"
      {...(showValue ? {} : props)}
    >
      <div className="bubli-progress__bar" style={indeterminate ? undefined : { width: `${safeValue}%` }} />
    </div>
  );

  if (!showValue) {
    return bar;
  }

  return (
    <div className={cn("bubli-progress-row", className)} {...props}>
      <div className="bubli-progress-row__head">
        <span>{label}</span>
        <span>{indeterminate ? "" : `${Math.round(safeValue)}%`}</span>
      </div>
      {bar}
    </div>
  );
}
