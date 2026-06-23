import { Bell, CheckCircle2, EyeOff, MessageCircle, Pin, RotateCcw, Sparkles, SquareCheckBig } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./widget-item-state-panel.module.css";

type BubbleType = "todo" | "agent" | "chat" | "notification" | "resource";
type WidgetItemState = "visible" | "confirmed" | "hidden" | "pinned" | "snoozed";

type WidgetItem = {
  bubbleType: BubbleType;
  itemId: string;
  itemType: string;
  meta: string;
  sourceLabel: string;
  state: WidgetItemState;
  title: string;
  updatedAt: string;
};

export type WidgetItemStatePanelProps = HTMLAttributes<HTMLElement> & {
  items: WidgetItem[];
  title?: string;
};

const bubbleMeta: Record<BubbleType, { icon: ReactNode; label: string; tone: StatusTone }> = {
  todo: {
    icon: <SquareCheckBig size={18} strokeWidth={2.1} />,
    label: "TODO 버블",
    tone: "todo",
  },
  agent: {
    icon: <Sparkles size={18} strokeWidth={2.1} />,
    label: "에이전트 버블",
    tone: "agent",
  },
  chat: {
    icon: <MessageCircle size={18} strokeWidth={2.1} />,
    label: "소통 버블",
    tone: "communication",
  },
  notification: {
    icon: <Bell size={18} strokeWidth={2.1} />,
    label: "알림 버블",
    tone: "warning",
  },
  resource: {
    icon: <RotateCcw size={18} strokeWidth={2.1} />,
    label: "자료 제안 버블",
    tone: "room",
  },
};

const stateMeta: Record<WidgetItemState, { label: string; tone: StatusTone }> = {
  visible: { label: "표시 중", tone: "pending" },
  confirmed: { label: "확인함", tone: "success" },
  hidden: { label: "숨김", tone: "neutral" },
  pinned: { label: "고정", tone: "approved" },
  snoozed: { label: "나중에 보기", tone: "warning" },
};

const actionList = [
  { icon: <CheckCircle2 size={15} strokeWidth={2.1} />, label: "확인", variant: "primary" as const },
  { icon: <EyeOff size={15} strokeWidth={2.1} />, label: "숨김", variant: "quiet" as const },
  { icon: <Pin size={15} strokeWidth={2.1} />, label: "고정", variant: "secondary" as const },
  { icon: <RotateCcw size={15} strokeWidth={2.1} />, label: "나중에 보기", variant: "ghost" as const },
];

export function WidgetItemStatePanel({ className, items, title = "버블 항목 상태", ...props }: WidgetItemStatePanelProps) {
  const activeCount = items.filter((item) => item.state === "visible" || item.state === "pinned").length;
  const handledCount = items.length - activeCount;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Pin size={14} strokeWidth={2.1} />}>widget_item_states</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              버블 안에 표시된 TODO, 알림, 채팅, 에이전트 제안은 항목별 상태를 따로 저장합니다. 같은 항목은 새로 쌓지 않고 기존 상태를 갱신합니다.
            </p>
          </div>
        </div>
        <div className={styles.summary}>
          <div>
            <span>현재 표시</span>
            <strong>{activeCount}건</strong>
          </div>
          <div>
            <span>처리됨</span>
            <strong>{handledCount}건</strong>
          </div>
        </div>
      </header>

      <section className={styles.storageRule} aria-label="저장 기준">
        <span aria-hidden="true">
          <CheckCircle2 size={18} strokeWidth={2.1} />
        </span>
        <p>
          상태 저장 기준은 사용자, 버블 종류, 항목 종류, 원본 항목 ID 조합입니다. 웹과 Tauri에서 다시 열어도 같은 상태가 유지되어야 합니다.
        </p>
      </section>

      <section className={styles.itemList} aria-label="버블 항목 상태 목록">
        {items.map((item) => {
          const bubble = bubbleMeta[item.bubbleType];
          const state = stateMeta[item.state];

          return (
            <article className={styles.itemCard} key={`${item.bubbleType}-${item.itemType}-${item.itemId}`}>
              <div className={styles.itemMain}>
                <span className={styles.bubbleIcon} aria-hidden="true">
                  {bubble.icon}
                </span>
                <div>
                  <div className={styles.titleLine}>
                    <h3>{item.title}</h3>
                    <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                  </div>
                  <p>{item.meta}</p>
                  <div className={styles.metaLine}>
                    <StatusBadge tone={bubble.tone}>{bubble.label}</StatusBadge>
                    <span>{item.sourceLabel}</span>
                    <span>{item.updatedAt}</span>
                  </div>
                </div>
              </div>

              <div className={styles.actions} aria-label={`${item.title} 상태 변경`}>
                {actionList.map((action) => (
                  <Button icon={action.icon} key={action.label} size="sm" variant={action.variant}>
                    {action.label}
                  </Button>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </GlassPanel>
  );
}
