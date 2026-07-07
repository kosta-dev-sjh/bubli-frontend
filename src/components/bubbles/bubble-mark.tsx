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
      {/* draggable=false: 바 브랜드/칩을 잡고 창을 끌 때 브라우저 네이티브 이미지 드래그
          고스트가 뜨는 현상 방지(CSS -webkit-user-drag: none과 함께). */}
      <img alt="" draggable={false} src={BUBBLE_ASSET} />
    </span>
  );
}
