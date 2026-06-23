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
import { cn } from "@/lib/utils";

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

const bubbleConfig: Record<BubbleType, BubbleConfig> = {
  todo: { icon: CheckCircle2, label: "TODO 버블", status: "오늘 할 일" },
  agent: { icon: Bot, label: "에이전트 버블", status: "후보 제안" },
  communication: { icon: MessageCircle, label: "소통 버블", status: "채팅과 보이스" },
  timer: { icon: Clock3, label: "타이머 버블", status: "작업 시간" },
  memo: { icon: NotebookPen, label: "메모 버블", status: "빠른 기록" },
  schedule: { icon: CalendarDays, label: "일정/WBS 버블", status: "일정과 작업" },
  resource: { icon: FileSearch, label: "자료 제안 버블", status: "관련 자료" },
  notification: { icon: Bell, label: "알림 버블", status: "확인 필요" },
};

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
  const config = bubbleConfig[type];
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
