import { useId } from "react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

export type RingSegment = {
  color?: string;
  label?: string;
  value: number;
};

type RingVariant = "progress" | "time" | "timer" | "todo";

type RingProps = {
  className?: string;
  label?: string;
  max?: number;
  metric?: string;
  segments?: RingSegment[];
  size?: number;
  thickness?: number;
  value?: number;
  variant?: RingVariant;
};

// Sky Opal 전용 — Sky / Bubble Blue / Opal Lilac / Soft Pink / rain (청록/민트 없음)
const RING_COLORS = ["#6FB8F2", "#B0A8E0", "#F2BBD2", "#9ED8FF", "#CBD8DC"];
const R = 42;
const C = 2 * Math.PI * R; // ≈ 263.9
const TRACK = "rgba(120, 150, 180, 0.16)";

export function Ring({
  className,
  label,
  max = 100,
  metric,
  segments,
  size = 96,
  thickness = 10,
  value = 0,
  variant,
}: RingProps) {
  const gid = useId().replace(/:/g, "");
  const isSegmented = Array.isArray(segments) && segments.length > 0;
  const total = isSegmented ? segments!.reduce((sum, s) => sum + s.value, 0) || 1 : 1;

  let acc = 0;
  const arcs = isSegmented
    ? segments!.map((seg, i) => {
        const dash = (seg.value / total) * C;
        const arc = {
          color: seg.color ?? RING_COLORS[i % RING_COLORS.length],
          dash,
          gap: C - dash,
          offset: -acc,
        };
        acc += dash;
        return arc;
      })
    : [];

  const fraction = Math.max(0, Math.min(1, value / (max || 1)));

  return (
    <div
      className={cn("bubli-ring", variant && `bubli-ring--${variant}`, className)}
      style={{ "--ring-metric": `${Math.round(size * 0.2)}px` } as CSSProperties}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label ?? metric ?? "ring"}>
        <defs>
          <linearGradient id={`ring-${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6FB8F2" />
            <stop offset="100%" stopColor="#DCD8F8" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={R} fill="none" stroke={TRACK} strokeWidth={thickness} />
        {isSegmented
          ? arcs.map((arc, i) => (
              <circle
                cx="50"
                cy="50"
                fill="none"
                key={i}
                r={R}
                stroke={arc.color}
                strokeDasharray={`${arc.dash} ${arc.gap}`}
                strokeDashoffset={arc.offset}
                strokeWidth={thickness}
              />
            ))
          : fraction > 0 && (
              <circle
                cx="50"
                cy="50"
                fill="none"
                r={R}
                stroke={`url(#ring-${gid})`}
                strokeDasharray={`${fraction * C} ${C}`}
                strokeLinecap="round"
                strokeWidth={thickness}
              />
            )}
      </svg>
      {(metric || label) && (
        <div className="bubli-ring__center">
          {metric ? <span className="bubli-ring__metric">{metric}</span> : null}
          {label ? <span className="bubli-ring__label">{label}</span> : null}
        </div>
      )}
    </div>
  );
}
