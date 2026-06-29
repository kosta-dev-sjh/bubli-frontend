import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

import { BUBBLE_ASSET } from "./bubble-mark";

type DecorSize = "sm" | "md" | "lg";

type DecorBubbleProps = HTMLAttributes<HTMLSpanElement> & {
  floating?: boolean;
  size?: DecorSize;
};

const sizeClass: Record<DecorSize, string> = {
  sm: "bubli-decor--sm",
  md: "bubli-decor--md",
  lg: "bubli-decor--lg",
};

// 배경 공기감 전용 장식. 소수만, opacity 낮게, motion은 float만. 기능 UI보다 우선순위 낮음.
export function DecorBubble({ className, floating = false, size = "md", style, ...props }: DecorBubbleProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("bubli-decor", sizeClass[size], floating && "bubli-decor--floating", className)}
      style={{ position: "absolute", ...style }}
      {...props}
    >
      <img alt="" src={BUBBLE_ASSET} />
    </span>
  );
}
