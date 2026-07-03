"use client";

import { Bell, CheckCircle2, EyeOff, MessageCircle, Pin, RotateCcw, Sparkles, SquareCheckBig } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
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

const bubbleMeta: Record<BubbleType, { icon: ReactNode; label: MessageKey; tone: StatusTone }> = {
  todo: {
    icon: <SquareCheckBig size={18} strokeWidth={2.1} />,
    label: "widget.bubble.todo",
    tone: "todo",
  },
  agent: {
    icon: <Sparkles size={18} strokeWidth={2.1} />,
    label: "widget.bubble.agent",
    tone: "agent",
  },
  chat: {
    icon: <MessageCircle size={18} strokeWidth={2.1} />,
    label: "widget.itemState.chat",
    tone: "communication",
  },
  notification: {
    icon: <Bell size={18} strokeWidth={2.1} />,
    label: "widget.bubble.notification",
    tone: "warning",
  },
  resource: {
    icon: <RotateCcw size={18} strokeWidth={2.1} />,
    label: "widget.bubble.resource",
    tone: "room",
  },
};

const stateMeta: Record<WidgetItemState, { label: MessageKey; tone: StatusTone }> = {
  visible: { label: "widget.itemState.state.visible", tone: "pending" },
  confirmed: { label: "widget.itemState.state.confirmed", tone: "success" },
  hidden: { label: "widget.itemState.state.hidden", tone: "neutral" },
  pinned: { label: "widget.itemState.state.pinned", tone: "approved" },
  snoozed: { label: "widget.itemState.state.snoozed", tone: "warning" },
};

const actionList: Array<{ icon: ReactNode; id: string; label: MessageKey; variant: "primary" | "quiet" | "secondary" | "ghost" }> = [
  { icon: <CheckCircle2 size={15} strokeWidth={2.1} />, id: "confirm", label: "widget.itemState.action.confirm", variant: "primary" },
  { icon: <EyeOff size={15} strokeWidth={2.1} />, id: "hide", label: "widget.itemState.action.hide", variant: "quiet" },
  { icon: <Pin size={15} strokeWidth={2.1} />, id: "pin", label: "widget.itemState.action.pin", variant: "secondary" },
  { icon: <RotateCcw size={15} strokeWidth={2.1} />, id: "snooze", label: "widget.itemState.action.snooze", variant: "ghost" },
];

export function WidgetItemStatePanel({ className, items, title, ...props }: WidgetItemStatePanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("widget.itemState.title");
  const activeCount = items.filter((item) => item.state === "visible" || item.state === "pinned").length;
  const handledCount = items.length - activeCount;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Pin size={14} strokeWidth={2.1} />}>{t("widget.itemState.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("widget.itemState.description")}</p>
          </div>
        </div>
        <div className={styles.summary}>
          <div>
            <span>{t("widget.itemState.currentVisible")}</span>
            <strong>{t("widget.itemState.count", { count: activeCount })}</strong>
          </div>
          <div>
            <span>{t("widget.itemState.handled")}</span>
            <strong>{t("widget.itemState.count", { count: handledCount })}</strong>
          </div>
        </div>
      </header>

      <section className={styles.storageRule} aria-label={t("widget.itemState.storageRuleAria")}>
        <span aria-hidden="true">
          <CheckCircle2 size={18} strokeWidth={2.1} />
        </span>
        <p>{t("widget.itemState.storageRule")}</p>
      </section>

      <section className={styles.itemList} aria-label={t("widget.itemState.listAria")}>
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
                    <StatusBadge tone={state.tone}>{t(state.label)}</StatusBadge>
                  </div>
                  <p>{item.meta}</p>
                  <div className={styles.metaLine}>
                    <StatusBadge tone={bubble.tone}>{t(bubble.label)}</StatusBadge>
                    <span>{item.sourceLabel}</span>
                    <span>{item.updatedAt}</span>
                  </div>
                </div>
              </div>

              <div className={styles.actions} aria-label={t("widget.itemState.changeAria", { title: item.title })}>
                {actionList.map((action) => (
                  <Button icon={action.icon} key={action.id} size="sm" variant={action.variant}>
                    {t(action.label)}
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
