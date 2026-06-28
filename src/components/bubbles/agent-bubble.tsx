import type { CSSProperties, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

import { BUBBLE_ASSET } from "./bubble-mark";

export type AgentState = "idle" | "listening" | "thinking" | "suggesting" | "waiting";

type AgentBubbleProps = HTMLAttributes<HTMLSpanElement> & {
  label?: string;
  size?: number;
  state?: AgentState;
};

const INK = "#6E63B8"; // Opal Lilac ink (청록 아님)

// 스마일(idle/suggesting). thinking은 점 3개로 대체.
function Face({ smiling }: { smiling: boolean }) {
  return (
    <svg className="bubli-agent__face" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9.2" cy="10.5" r="1.05" fill={INK} />
      <circle cx="14.8" cy="10.5" r="1.05" fill={INK} />
      {smiling ? (
        <path d="M9.2 14c1 1 4.6 1 5.6 0" stroke={INK} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M9.6 14h4.8" stroke={INK} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function AgentBubble({ className, label, size = 32, state = "idle", ...props }: AgentBubbleProps) {
  const isThinking = state === "thinking";
  const isWaiting = state === "waiting";
  const smiling = state === "idle" || state === "suggesting";

  return (
    <span
      aria-label={label ?? `에이전트 ${state}`}
      className={cn("bubli-agent", `bubli-agent--${state}`, className)}
      role="img"
      style={{ width: size, height: size } as CSSProperties}
      {...props}
    >
      <img alt="" src={BUBBLE_ASSET} />
      {isThinking ? (
        <span className="bubli-agent__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      ) : (
        <Face smiling={smiling} />
      )}
      {isWaiting ? <span className="bubli-agent__signal" aria-hidden="true" /> : null}
    </span>
  );
}
