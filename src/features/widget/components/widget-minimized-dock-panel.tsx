"use client";

import { Bell, CheckCircle2, Clock3, MessageCircle, Minus, PanelTop, Sparkles, TimerReset } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./widget-minimized-dock-panel.module.css";

type DockItemTone = "todo" | "agent" | "communication" | "timer" | "memo" | "schedule" | "resource" | "notification";

type DockItemSource = "server" | "cache" | "local";

type DockItem = {
  badge: MessageKey;
  description: MessageKey;
  label: MessageKey;
  source: DockItemSource;
  tone: DockItemTone;
  value: MessageKey;
};

export type WidgetMinimizedDockPanelProps = HTMLAttributes<HTMLElement> & {
  dockItems: DockItem[];
  lastSyncedLabel: string;
  title?: string;
};

const toneMeta: Record<DockItemTone, { icon: ReactNode; label: MessageKey; statusTone: StatusTone }> = {
  agent: { icon: <Sparkles size={15} strokeWidth={2.1} />, label: "widget.kind.agent", statusTone: "agent" },
  communication: { icon: <MessageCircle size={15} strokeWidth={2.1} />, label: "widget.kind.chat", statusTone: "communication" },
  memo: { icon: <PanelTop size={15} strokeWidth={2.1} />, label: "widget.kind.memo", statusTone: "memo" },
  notification: { icon: <Bell size={15} strokeWidth={2.1} />, label: "widget.kind.notification", statusTone: "warning" },
  resource: { icon: <CheckCircle2 size={15} strokeWidth={2.1} />, label: "widget.kind.resource", statusTone: "room" },
  schedule: { icon: <Clock3 size={15} strokeWidth={2.1} />, label: "widget.kind.schedule", statusTone: "personal" },
  timer: { icon: <TimerReset size={15} strokeWidth={2.1} />, label: "widget.kind.timer", statusTone: "timer" },
  todo: { icon: <CheckCircle2 size={15} strokeWidth={2.1} />, label: "widget.kind.todo", statusTone: "todo" },
};

const sourceMeta: Record<DockItemSource, { label: MessageKey; tone: StatusTone }> = {
  cache: { label: "widget.source.cache", tone: "pending" },
  local: { label: "widget.source.local", tone: "memo" },
  server: { label: "widget.source.server", tone: "success" },
};

export const defaultDockItems: DockItem[] = [
  {
    badge: "widget.dock.todo.badge",
    description: "widget.dock.todo.description",
    label: "widget.bubble.todo",
    source: "server",
    tone: "todo",
    value: "widget.dock.todo.value",
  },
  {
    badge: "widget.dock.agent.badge",
    description: "widget.dock.agent.description",
    label: "widget.bubble.agent",
    source: "server",
    tone: "agent",
    value: "widget.dock.agent.value",
  },
  {
    badge: "widget.dock.chat.badge",
    description: "widget.dock.chat.description",
    label: "widget.bubble.chat",
    source: "cache",
    tone: "communication",
    value: "widget.dock.chat.value",
  },
  {
    badge: "widget.dock.timer.badge",
    description: "widget.dock.timer.description",
    label: "widget.bubble.timer",
    source: "server",
    tone: "timer",
    value: "widget.dock.timer.value",
  },
];

export function WidgetMinimizedDockPanel({
  className,
  dockItems,
  lastSyncedLabel,
  title,
  ...props
}: WidgetMinimizedDockPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("widget.dock.title");
  const serverCount = dockItems.filter((item) => item.source === "server").length;
  const cachedCount = dockItems.filter((item) => item.source !== "server").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Minus size={16} strokeWidth={2.1} />}>{t("widget.dock.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("widget.dock.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("widget.dock.summaryLabel")}</span>
          <strong>{t("widget.dock.badgeCount", { count: dockItems.length })}</strong>
          <em>{lastSyncedLabel}</em>
        </div>
      </header>

      <section className={styles.dockSurface} aria-label={t("widget.dock.surfaceAria")}>
        <div className={styles.dockBar}>
          <span className={styles.brandDot} aria-hidden="true" />
          <strong>Bubli</strong>
          <small>{t("widget.dock.working")}</small>
          <StatusBadge tone="success">{t("widget.dock.serverCount", { count: serverCount })}</StatusBadge>
          <StatusBadge tone="pending">{t("widget.dock.cacheCount", { count: cachedCount })}</StatusBadge>
        </div>

        <div className={styles.itemGrid}>
          {dockItems.map((item) => {
            const tone = toneMeta[item.tone];
            const source = sourceMeta[item.source];

            return (
              <article className={cn(styles.dockItem, styles[item.tone])} key={`${item.label}-${item.value}`}>
                <div className={styles.itemTop}>
                  <span className={styles.itemIcon} aria-hidden="true">
                    {tone.icon}
                  </span>
                  <div>
                    <strong>{t(item.label)}</strong>
                    <p>{t(tone.label)}</p>
                  </div>
                  <StatusBadge tone={source.tone}>{t(source.label)}</StatusBadge>
                </div>
                <div className={styles.itemBody}>
                  <b>{t(item.value)}</b>
                  <span>{t(item.description)}</span>
                </div>
                <div className={styles.itemFooter}>
                  <em>{t(item.badge)}</em>
                  <button type="button">{t("widget.dock.open")}</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.policyGrid} aria-label={t("widget.dock.policyAria")}>
        <article>
          <CheckCircle2 size={16} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("widget.dock.policyCoreTitle")}</strong>
            <p>{t("widget.dock.policyCoreBody")}</p>
          </div>
        </article>
        <article>
          <Bell size={16} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("widget.dock.policyAlertTitle")}</strong>
            <p>{t("widget.dock.policyAlertBody")}</p>
          </div>
        </article>
        <article>
          <PanelTop size={16} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("widget.dock.policyStateTitle")}</strong>
            <p>{t("widget.dock.policyStateBody")}</p>
          </div>
        </article>
      </section>

      <footer className={styles.footer}>
        <Button icon={<PanelTop size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          {t("widget.dock.expandAll")}
        </Button>
        <Button icon={<Bell size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          {t("widget.dock.alertsOnly")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
