import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const BUBBLE_ASSET = "/assets/bubble-sky.webp";

type BubbleMarkSize = "sm" | "md" | "lg";

type BubbleMarkProps = HTMLAttributes<HTMLSpanElement> & {
  animated?: boolean;
  size?: BubbleMarkSize;
};

const sizeClass: Record<BubbleMarkSize, string> = {
  sm: "bubli-mark--sm",
  md: "bubli-mark--md",
  lg: "bubli-mark--lg",
};

export function BubbleMark({ animated = false, className, size = "md", ...props }: BubbleMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("bubli-mark", sizeClass[size], animated && "bubli-mark--animated", className)}
      {...props}
    >
      <img alt="" src={BUBBLE_ASSET} />
    </span>
  );
}
