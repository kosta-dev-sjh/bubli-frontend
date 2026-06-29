import type { ButtonHTMLAttributes, CSSProperties } from "react";

import { cn } from "@/lib/utils";

import { BUBBLE_ASSET } from "./bubble-mark";

type BubbleOrbProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  badge?: number;
  count?: number;
  label?: string;
  size?: number;
};

// 위젯 메뉴 핸들 · 최소화 오브 · Dock 진입점. 본체는 투명 이미지 버블.
export function BubbleOrb({
  active = false,
  badge,
  className,
  count,
  label,
  size = 50,
  style,
  type = "button",
  ...props
}: BubbleOrbProps) {
  return (
    <button
      aria-label={label}
      className={cn("bubli-orb", active && "bubli-orb--active", className)}
      style={{ width: size, height: size, ...style } as CSSProperties}
      type={type}
      {...props}
    >
      <img alt="" src={BUBBLE_ASSET} />
      {typeof count === "number" ? <span className="bubli-orb__count">{count}</span> : null}
      {typeof badge === "number" && badge > 0 ? <span className="bubli-orb__badge">{badge}</span> : null}
    </button>
  );
}

// DockOrb는 BubbleOrb의 의미적 별칭(Dock 진입점)
export const DockOrb = BubbleOrb;
