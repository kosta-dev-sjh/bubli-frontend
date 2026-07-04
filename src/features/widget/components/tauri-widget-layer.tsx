"use client";

import {
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  EyeOff,
  FolderSearch,
  Grip,
  MessageCircle,
  Minus,
  NotebookPen,
  Pin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Chip, GlassPanel, StatusBadge } from "@/components/ui";
import type { StatusTone } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./tauri-widget-layer.module.css";

// [TAURI WIDGET HOOK] 이모지 퐁퐁 데스크톱 미러링(미구현):
// 채팅에서 이모지 전용 메시지가 오면 window에 "bubli:emoji-splash" CustomEvent가 발행된다
// (계약: src/features/communication/components/emoji-splash-layer.tsx의 EmojiSplashDetail).
// 데스크톱 위젯 레이어를 확장할 때 이 이벤트를 구독해 Tauri 오버레이 창(항상 위 투명 창)으로
// 이모지를 미러링하면 된다 — 웹/하이브리드 스레드 오버레이는 이미 EmojiSplashLayer가 담당한다.

type WidgetBubbleEntry = {
  title: MessageKey;
  dockLabel: MessageKey;
  subtitle: MessageKey;
  rows: [MessageKey, MessageKey];
  source: MessageKey;
  tone: string;
  icon: typeof CheckCircle2;
};

const widgetBubbles: WidgetBubbleEntry[] = [
  {
    title: "widget.bubble.todo",
    dockLabel: "widget.kind.todo",
    subtitle: "widget.layer.todo.subtitle",
    rows: ["widget.layer.todo.row1", "widget.layer.todo.row2"],
    source: "widget.layer.todo.source",
    tone: "todo",
    icon: CheckCircle2,
  },
  {
    title: "widget.layer.agent.title",
    dockLabel: "widget.kind.agent",
    subtitle: "widget.layer.agent.subtitle",
    rows: ["widget.layer.agent.row1", "widget.layer.agent.row2"],
    source: "widget.layer.agent.source",
    tone: "agent",
    icon: Bot,
  },
  {
    title: "widget.bubble.timer",
    dockLabel: "widget.kind.timer",
    subtitle: "widget.layer.timer.subtitle",
    rows: ["widget.layer.timer.row1", "widget.layer.timer.row2"],
    source: "widget.layer.timer.source",
    tone: "timer",
    icon: Clock3,
  },
  {
    title: "widget.bubble.chat",
    dockLabel: "widget.kind.chat",
    subtitle: "widget.layer.chat.subtitle",
    rows: ["widget.layer.chat.row1", "widget.layer.chat.row2"],
    source: "widget.layer.chat.source",
    tone: "communication",
    icon: MessageCircle,
  },
  {
    title: "widget.bubble.memo",
    dockLabel: "widget.kind.memo",
    subtitle: "widget.layer.memo.subtitle",
    rows: ["widget.layer.memo.row1", "widget.layer.memo.row2"],
    source: "widget.layer.memo.source",
    tone: "memo",
    icon: NotebookPen,
  },
  {
    title: "widget.bubble.scheduleWbs",
    dockLabel: "widget.kind.schedule",
    subtitle: "widget.layer.schedule.subtitle",
    rows: ["widget.layer.schedule.row1", "widget.layer.schedule.row2"],
    source: "widget.layer.schedule.source",
    tone: "schedule",
    icon: CalendarDays,
  },
  {
    title: "widget.bubble.resource",
    dockLabel: "widget.kind.resource",
    subtitle: "widget.layer.resource.subtitle",
    rows: ["widget.layer.resource.row1", "widget.layer.resource.row2"],
    source: "widget.layer.resource.source",
    tone: "resource",
    icon: FolderSearch,
  },
  {
    title: "widget.bubble.notification",
    dockLabel: "widget.kind.notification",
    subtitle: "widget.layer.notification.subtitle",
    rows: ["widget.layer.notification.row1", "widget.layer.notification.row2"],
    source: "widget.layer.notification.source",
    tone: "notification",
    icon: Bell,
  },
];

const controls: Array<[MessageKey, LucideIcon]> = [
  ["widget.layer.control.pin", Pin],
  ["widget.layer.control.ghost", EyeOff],
  ["widget.layer.control.minimize", Minus],
];

const statusToneByBubble: Record<string, StatusTone> = {
  agent: "agent",
  communication: "communication",
  memo: "memo",
  notification: "neutral",
  resource: "room",
  schedule: "pending",
  timer: "timer",
  todo: "todo",
};

const policyRows: Array<[MessageKey, MessageKey]> = [
  ["widget.layer.policy.personalTitle", "widget.layer.policy.personalBody"],
  ["widget.layer.policy.permissionTitle", "widget.layer.policy.permissionBody"],
  ["widget.layer.policy.storageTitle", "widget.layer.policy.storageBody"],
  ["widget.layer.policy.motionTitle", "widget.layer.policy.motionBody"],
];

export function TauriWidgetLayer() {
  const { t } = useI18n();
  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <Grip size={16} aria-hidden="true" />
          {t("widget.layer.eyebrow")}
        </div>
        <div className={styles.titleRow}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>{t("widget.layer.title")}</h2>
            <p className={styles.summary}>{t("widget.layer.summary")}</p>
          </div>
          <StatusBadge tone="personal">{t("widget.layer.badge")}</StatusBadge>
        </div>
        <div className={styles.chips} aria-label={t("widget.layer.chipsAria")}>
          <Chip selected>{t("widget.layer.chipDensity")}</Chip>
          <Chip>{t("widget.layer.chipFont")}</Chip>
          <Chip>{t("widget.layer.chipGhost")}</Chip>
          <Chip>{t("widget.layer.chipPin")}</Chip>
        </div>
      </header>

      <section className={styles.stage} aria-label={t("widget.layer.stageAria")}>
        <div className={styles.toolbar}>
          <div>
            <h3>{t("widget.layer.stageTitle")}</h3>
            <p>{t("widget.layer.stageBody")}</p>
          </div>
          <div className={styles.density}>
            <span>{t("widget.layer.densityDefault")}</span>
            <span>{t("widget.layer.densityFocus")}</span>
            <span>{t("widget.layer.densityCompact")}</span>
          </div>
        </div>

        <div className={styles.widgetGrid}>
          {widgetBubbles.map((bubble) => {
            const Icon = bubble.icon;
            const title = t(bubble.title);

            return (
              <article className={`${styles.widgetCard} ${styles[bubble.tone]}`} key={bubble.title}>
                <div className={styles.widgetHead}>
                  <h4>
                    <Icon size={16} aria-hidden="true" />
                    {title}
                  </h4>
                  <div className={styles.controls}>
                    {controls.map(([label, ControlIcon]) => (
                      <button aria-label={t("widget.layer.controlAria", { title, label: t(label) })} key={label} type="button">
                        <ControlIcon size={13} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
                <p className={styles.subtitle}>{t(bubble.subtitle)}</p>
                <div className={styles.rows}>
                  {bubble.rows.map((row) => (
                    <div className={styles.widgetRow} key={row}>
                      <span />
                      <strong>{t(row)}</strong>
                    </div>
                  ))}
                </div>
                <StatusBadge tone={statusToneByBubble[bubble.tone]}>{t(bubble.source)}</StatusBadge>
              </article>
            );
          })}
        </div>

        <div className={styles.dock} aria-label={t("widget.layer.dockAria")}>
          {widgetBubbles.map((bubble) => (
            <button key={bubble.title} type="button">
              {t(bubble.dockLabel)}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.policyGrid} aria-label={t("widget.layer.policyGridAria")}>
        {policyRows.map(([label, body]) => (
          <article className={styles.policyCard} key={label}>
            <h3>{t(label)}</h3>
            <p>{t(body)}</p>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
