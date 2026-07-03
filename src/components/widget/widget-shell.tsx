"use client";

import type { HTMLAttributes } from "react";

import { AgentBubble, BubbleBar, BubbleMark, DockOrb } from "@/components/bubbles";
import { Ring, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type WidgetMode = "default" | "translucent" | "ghost" | "minimal";
export type WidgetDensity = "compact" | "expanded";

type WidgetShellProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  agentCount?: number;
  agentMessage?: string;
  breathe?: boolean;
  density?: WidgetDensity;
  interactive?: boolean;
  mode?: WidgetMode;
  onExpand?: () => void;
  onMinimize?: () => void;
  projectLabel?: string;
  scheduleCount?: number;
  sleep?: boolean;
  timerText?: string;
  title?: string;
  todoCount?: number;
  todos?: string[];
};

export function WidgetShell({
  agentCount,
  agentMessage,
  breathe = false,
  className,
  density,
  interactive = false,
  mode = "default",
  onExpand,
  onMinimize,
  projectLabel,
  scheduleCount,
  sleep = false,
  timerText,
  title,
  todoCount,
  todos,
  ...props
}: WidgetShellProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("widget.data.todo.label");
  const resolvedTodos = todos ?? [t("widget.shell.todo1"), t("widget.shell.todo2"), t("widget.shell.todo3")];
  // --- Minimal: BubbleBar + DockOrb로 접힘 ---
  if (mode === "minimal") {
    return (
      <div className={cn("bubli-widget", "bubli-widget--minimal", sleep && "bubli-widget--sleep", className)} {...props}>
        <BubbleBar onClick={onExpand} schedules={scheduleCount} todos={todoCount} />
        <DockOrb count={todoCount} label={t("widget.shell.expand")} onClick={onExpand} />
      </div>
    );
  }

  // --- Ghost: 거의 투명, 본문 숨김, 핵심 신호만 ---
  if (mode === "ghost") {
    return (
      <div className={cn("bubli-widget", "bubli-widget--ghost", sleep && "bubli-widget--sleep", className)} {...props}>
        <div className="bubli-widget__ghost">
          <Ring label={undefined} metric={String(todoCount ?? 0)} size={46} thickness={9} value={66} />
          {typeof scheduleCount === "number" ? (
            <span className="bubli-widget__signal">
              <span className="dot d-schedule" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--signal-memo)" }} />
              {t("widget.shell.scheduleSignal", { count: scheduleCount })}
            </span>
          ) : null}
          {agentCount ? <AgentBubble label={t("widget.shell.agentWaiting")} size={24} state="waiting" /> : null}
          <span className="bubli-widget__signal">
            <span className="bubli-widget__through">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              {t("widget.shell.clickThrough")}
            </span>
          </span>
        </div>
      </div>
    );
  }

  // --- Default / Translucent: 같은 구조, 밀도/질감 차이 ---
  const isTranslucent = mode === "translucent";
  const shownTodos = isTranslucent ? resolvedTodos.slice(0, 2) : resolvedTodos;

  return (
    <div
      className={cn(
        "bubli-widget",
        isTranslucent && "bubli-widget--translucent",
        density && `bubli-widget--${density}`,
        breathe && !sleep && "bubli-widget--breathe",
        interactive && "bubli-widget--interactive",
        sleep && "bubli-widget--sleep",
        className,
      )}
      onClick={interactive ? onExpand : undefined}
      {...props}
    >
      <div className="bubli-widget__head">
        <span className="bubli-widget__title">
          <BubbleMark size="sm" />
          {projectLabel ?? resolvedTitle}
        </span>
        <span style={{ display: "inline-flex", gap: 6 }}>
          {typeof todoCount === "number" ? <StatusBadge tone="todo">{todoCount}</StatusBadge> : null}
          {onMinimize ? (
            <button
              aria-label={t("widget.control.minimize")}
              className="bubli-button bubli-button--ghost bubli-button--sm"
              onClick={onMinimize}
              type="button"
            >
              −
            </button>
          ) : null}
        </span>
      </div>

      <div className="bubli-widget__body">
        {shownTodos.map((todo, i) => (
          <div className="bubli-widget__item" key={todo}>
            <span className={cn("bubli-widget__cb", i === 0 && "bubli-widget__cb--done")} />
            <span style={{ flex: 1, minWidth: 0 }}>{todo}</span>
          </div>
        ))}
      </div>

      {timerText && !isTranslucent ? <p className="bubli-widget__timer">{timerText}</p> : null}

      {agentMessage ? (
        <div className="bubli-widget__agent">
          <AgentBubble size={26} state="suggesting" />
          <p>{agentMessage}</p>
        </div>
      ) : null}
    </div>
  );
}
