"use client";

import type { CSSProperties, HTMLAttributes } from "react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { BUBBLE_ASSET } from "./bubble-mark";

export type AgentState = "idle" | "listening" | "thinking" | "suggesting" | "waiting";

type AgentBubbleProps = HTMLAttributes<HTMLSpanElement> & {
  label?: string;
  size?: number;
  state?: AgentState;
};

// 스마일(idle/suggesting). thinking은 점 3개로 대체.
// 색은 Opal Lilac ink — CSS .bubli-agent__face의 color(var(--lilac-ink))를 currentColor로 받는다(청록 아님).
function Face({ smiling }: { smiling: boolean }) {
  return (
    <svg className="bubli-agent__face" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9.2" cy="10.5" r="1.05" fill="currentColor" />
      <circle cx="14.8" cy="10.5" r="1.05" fill="currentColor" />
      {smiling ? (
        <path d="M9.2 14c1 1 4.6 1 5.6 0" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M9.6 14h4.8" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function AgentBubble({ className, label, size = 32, state = "idle", ...props }: AgentBubbleProps) {
  const { t } = useI18n();
  const isThinking = state === "thinking";
  const isWaiting = state === "waiting";
  const smiling = state === "idle" || state === "suggesting";

  return (
    <span
      aria-label={label ?? t("bubble.agentAria", { state })}
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
