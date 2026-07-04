"use client";

import { Bell, CheckCircle2, EyeOff, MessageCircle, Pin, RotateCcw, Sparkles, SquareCheckBig } from "lucide-react";
import { useCallback, useMemo, useState, type HTMLAttributes, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { toBackendWidgetItemType, type BackendWidgetBubbleType } from "@/features/widget/api/widgetApi";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { saveWidgetItemState } from "@/lib/widget/widget-local-client";
import type { WidgetItemState as ApiWidgetItemState } from "@/types/api/widget";

import styles from "./widget-item-state-panel.module.css";

type BubbleType = "todo" | "agent" | "chat" | "notification" | "resource";
type WidgetItemState = "visible" | "confirmed" | "hidden" | "pinned" | "snoozed";
type WidgetItemStateAction = "confirm" | "hide" | "pin" | "snooze";
type WidgetItem = {
  bubbleType: BubbleType;
  itemId: string;
  itemType: string;
  meta: string;
  sourceLabel: string;
  state: WidgetItemState;
  stateId?: string;
  title: string;
  updatedAt: string;
};

export type WidgetItemStateChange = {
  item: WidgetItem;
  nextState: WidgetItemState;
  persisted: boolean;
};

export type WidgetItemStatePanelProps = HTMLAttributes<HTMLElement> & {
  items: WidgetItem[];
  onStateChange?: (change: WidgetItemStateChange) => Promise<void> | void;
  persistItemState?: boolean;
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

const actionList: Array<{ icon: ReactNode; id: WidgetItemStateAction; label: MessageKey; variant: "primary" | "quiet" | "secondary" | "ghost" }> = [
  { icon: <CheckCircle2 size={15} strokeWidth={2.1} />, id: "confirm", label: "widget.itemState.action.confirm", variant: "primary" },
  { icon: <EyeOff size={15} strokeWidth={2.1} />, id: "hide", label: "widget.itemState.action.hide", variant: "quiet" },
  { icon: <Pin size={15} strokeWidth={2.1} />, id: "pin", label: "widget.itemState.action.pin", variant: "secondary" },
  { icon: <RotateCcw size={15} strokeWidth={2.1} />, id: "snooze", label: "widget.itemState.action.snooze", variant: "ghost" },
];

const backendBubbleTypeMap: Partial<Record<BubbleType, BackendWidgetBubbleType>> = {
  agent: "AGENT",
  chat: "CHAT",
  notification: "ALERT",
  resource: "RESOURCE",
  todo: "TODO",
};

const actionStateMap: Record<WidgetItemStateAction, { apiState: ApiWidgetItemState; state: WidgetItemState }> = {
  confirm: { apiState: "CONFIRMED", state: "confirmed" },
  hide: { apiState: "HIDDEN", state: "hidden" },
  pin: { apiState: "PINNED", state: "pinned" },
  snooze: { apiState: "SNOOZED", state: "snoozed" },
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function itemKey(item: WidgetItem) {
  return `${item.bubbleType}:${item.itemType}:${item.itemId}`;
}

export function WidgetItemStatePanel({ className, items, onStateChange, persistItemState = true, title, ...props }: WidgetItemStatePanelProps) {
  const { t } = useI18n();
  const [itemStateOverrides, setItemStateOverrides] = useState<Record<string, WidgetItemState>>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(() => new Set());
  const [noticeKey, setNoticeKey] = useState<MessageKey | null>(null);
  const resolvedTitle = title ?? t("widget.itemState.title");
  const panelItems = useMemo(
    () => items.map((item) => ({ ...item, state: itemStateOverrides[itemKey(item)] ?? item.state })),
    [itemStateOverrides, items],
  );
  const activeCount = panelItems.filter((item) => item.state === "visible" || item.state === "pinned").length;
  const handledCount = panelItems.length - activeCount;

  const persistableKeys = useMemo(() => {
    if (!persistItemState) return new Set<string>();
    return new Set(
      panelItems.flatMap((item) => {
        const backendBubbleType = backendBubbleTypeMap[item.bubbleType];
        const backendItemType = toBackendWidgetItemType(item.itemType);
        const itemStateId = item.stateId ?? (isUuid(item.itemId) ? item.itemId : null);
        return backendBubbleType && backendItemType && itemStateId ? [itemKey(item)] : [];
      }),
    );
  }, [panelItems, persistItemState]);

  const handleStateChange = useCallback(
    async (item: WidgetItem, action: WidgetItemStateAction) => {
      const key = itemKey(item);
      const next = actionStateMap[action];
      const previousState = item.state;
      const backendBubbleType = backendBubbleTypeMap[item.bubbleType];
      const backendItemType = toBackendWidgetItemType(item.itemType);
      const itemStateId = item.stateId ?? (isUuid(item.itemId) ? item.itemId : null);
      const shouldPersist = Boolean(persistItemState && backendBubbleType && backendItemType && itemStateId);

      setNoticeKey(null);
      setSavingKeys((current) => new Set(current).add(key));
      setItemStateOverrides((current) => ({ ...current, [key]: next.state }));

      try {
        if (shouldPersist && backendBubbleType && backendItemType && itemStateId) {
          await saveWidgetItemState({
            bubbleType: backendBubbleType,
            itemId: item.itemId,
            itemStateId,
            itemType: backendItemType,
            state: next.apiState,
          });
        }
        await onStateChange?.({ item, nextState: next.state, persisted: shouldPersist });
        setNoticeKey(shouldPersist ? "widget.itemState.notice.saved" : "widget.itemState.notice.localOnly");
      } catch {
        setItemStateOverrides((current) => ({ ...current, [key]: previousState }));
        setNoticeKey("widget.itemState.notice.failed");
      } finally {
        setSavingKeys((current) => {
          const nextKeys = new Set(current);
          nextKeys.delete(key);
          return nextKeys;
        });
      }
    },
    [onStateChange, persistItemState],
  );

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

      {noticeKey ? <p className={styles.notice}>{t(noticeKey)}</p> : null}

      <section className={styles.itemList} aria-label={t("widget.itemState.listAria")}>
        {panelItems.map((item) => {
          const bubble = bubbleMeta[item.bubbleType];
          const state = stateMeta[item.state];
          const key = itemKey(item);
          const isSaving = savingKeys.has(key);

          return (
            <article className={styles.itemCard} key={key}>
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
                    <StatusBadge tone={persistableKeys.has(key) ? "success" : "neutral"}>
                      {t(persistableKeys.has(key) ? "widget.itemState.persist.server" : "widget.itemState.persist.local")}
                    </StatusBadge>
                    <span>{item.sourceLabel}</span>
                    <span>{item.updatedAt}</span>
                  </div>
                </div>
              </div>

              <div className={styles.actions} aria-label={t("widget.itemState.changeAria", { title: item.title })}>
                {actionList.map((action) => (
                  <Button
                    icon={action.icon}
                    key={action.id}
                    loading={isSaving}
                    onClick={() => void handleStateChange(item, action.id)}
                    size="sm"
                    variant={action.variant}
                  >
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
