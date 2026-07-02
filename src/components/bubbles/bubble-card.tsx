"use client";

import {
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileSearch,
  MessageCircle,
  NotebookPen,
} from "lucide-react";
import type { ComponentType, HTMLAttributes, ReactNode } from "react";

import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

export type BubbleType =
  | "todo"
  | "agent"
  | "communication"
  | "timer"
  | "memo"
  | "schedule"
  | "resource"
  | "notification";

export type BubbleDisplayMode = "default" | "ghost" | "minimized";

type BubbleConfig = {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  status: string;
};

const bubbleIcons: Record<BubbleType, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  todo: CheckCircle2,
  agent: Bot,
  communication: MessageCircle,
  timer: Clock3,
  memo: NotebookPen,
  schedule: CalendarDays,
  resource: FileSearch,
  notification: Bell,
};

function bubbleConfigOf(t: TranslateFn, type: BubbleType): BubbleConfig {
  return {
    icon: bubbleIcons[type],
    label: t(`bubble.${type}.label` as MessageKey),
    status: t(`bubble.${type}.status` as MessageKey),
  };
}

type BubbleCardProps = HTMLAttributes<HTMLElement> & {
  actions?: ReactNode;
  displayMode?: BubbleDisplayMode;
  items?: string[];
  meta?: string;
  progressLabel?: string;
  progressValue?: number;
  title?: string;
  type: BubbleType;
};

export function BubbleCard({
  actions,
  className,
  displayMode = "default",
  items = [],
  meta,
  progressLabel,
  progressValue,
  title,
  type,
  ...props
}: BubbleCardProps) {
  const { t } = useI18n();
  const config = bubbleConfigOf(t, type);
  const Icon = config.icon;
  const isMinimized = displayMode === "minimized";

  return (
    <article
      className={cn(
        "bubli-bubble",
        `bubli-bubble--${type}`,
        displayMode === "ghost" && "bubli-bubble--ghost",
        isMinimized && "bubli-bubble--minimized",
        className,
      )}
      {...props}
    >
      <header className="bubli-bubble__header">
        <div className="bubli-bubble__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <Icon size={18} strokeWidth={2.2} />
          </span>
          <span>{title ?? config.label}</span>
        </div>
        <StatusBadge tone={type === "agent" ? "agent" : type === "communication" ? "communication" : type === "timer" ? "timer" : "todo"}>
          {meta ?? config.status}
        </StatusBadge>
      </header>

      {isMinimized ? null : (
        <div className="bubli-bubble__body">
          {typeof progressValue === "number" ? (
            <ProgressBar label={progressLabel ?? config.label} value={progressValue} />
          ) : null}
          {items.length > 0 ? (
            <ul className="bubli-bubble__list" style={{ marginTop: typeof progressValue === "number" ? 12 : 0 }}>
              {items.map((item) => (
                <li className="bubli-bubble__item" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
          {actions ? <div style={{ marginTop: 14 }}>{actions}</div> : null}
        </div>
      )}
    </article>
  );
}
