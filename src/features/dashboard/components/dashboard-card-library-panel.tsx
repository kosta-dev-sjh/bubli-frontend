"use client";

import {
  BellRing,
  CalendarDays,
  FolderSearch,
  Grip,
  LayoutDashboard,
  ListTodo,
  PanelTop,
  Plus,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./dashboard-card-library-panel.module.css";

type DashboardCardKind = "TODO" | "SCHEDULE_WBS" | "REVIEW" | "AGENT" | "TIMER" | "RESOURCE";
type CardSource = "SERVER_ORIGINAL" | "ACTIVITY_ROLLUP" | "LOCAL_HINT";
type CardStatus = "ADDED" | "AVAILABLE" | "DISABLED";

type DashboardCardOption = {
  countLabelKey: MessageKey;
  descriptionKey: MessageKey;
  kind: DashboardCardKind;
  source: CardSource;
  sourceLabelKey: MessageKey;
  status: CardStatus;
  titleKey: MessageKey;
  tone: StatusTone;
};

type DashboardRule = {
  descriptionKey: MessageKey;
  labelKey: MessageKey;
  tone: StatusTone;
};

export type DashboardCardLibraryPanelProps = HTMLAttributes<HTMLElement> & {
  cards: DashboardCardOption[];
  rules: DashboardRule[];
  selectedProjectRoomName?: string;
  titleKey?: MessageKey;
};

const cardIcons: Record<DashboardCardKind, typeof ListTodo> = {
  AGENT: Sparkles,
  RESOURCE: FolderSearch,
  REVIEW: BellRing,
  SCHEDULE_WBS: CalendarDays,
  TIMER: Timer,
  TODO: ListTodo,
};

const statusMeta: Record<CardStatus, { actionKey: MessageKey; labelKey: MessageKey; tone: StatusTone }> = {
  ADDED: { actionKey: "dashboard.library.status.addedAction", labelKey: "dashboard.library.status.addedLabel", tone: "approved" },
  AVAILABLE: { actionKey: "dashboard.library.status.availableAction", labelKey: "dashboard.library.status.availableLabel", tone: "pending" },
  DISABLED: { actionKey: "dashboard.library.status.disabledAction", labelKey: "dashboard.library.status.disabledLabel", tone: "personal" },
};

const sourceMeta: Record<CardSource, MessageKey> = {
  LOCAL_HINT: "dashboard.library.source.localHint",
  SERVER_ORIGINAL: "dashboard.library.source.serverOriginal",
  ACTIVITY_ROLLUP: "dashboard.library.source.activityRollup",
};

export const defaultDashboardCards: DashboardCardOption[] = [
  {
    countLabelKey: "dashboard.library.card.todoCount",
    descriptionKey: "dashboard.library.card.todoDesc",
    kind: "TODO",
    source: "SERVER_ORIGINAL",
    sourceLabelKey: "dashboard.library.card.todoSource",
    status: "ADDED",
    titleKey: "dashboard.library.card.todoTitle",
    tone: "todo",
  },
  {
    countLabelKey: "dashboard.library.card.scheduleCount",
    descriptionKey: "dashboard.library.card.scheduleDesc",
    kind: "SCHEDULE_WBS",
    source: "SERVER_ORIGINAL",
    sourceLabelKey: "dashboard.library.card.scheduleSource",
    status: "AVAILABLE",
    titleKey: "dashboard.library.card.scheduleTitle",
    tone: "room",
  },
  {
    countLabelKey: "dashboard.library.card.reviewCount",
    descriptionKey: "dashboard.library.card.reviewDesc",
    kind: "REVIEW",
    source: "SERVER_ORIGINAL",
    sourceLabelKey: "dashboard.library.card.reviewSource",
    status: "ADDED",
    titleKey: "dashboard.library.card.reviewTitle",
    tone: "warning",
  },
  {
    countLabelKey: "dashboard.library.card.agentCount",
    descriptionKey: "dashboard.library.card.agentDesc",
    kind: "AGENT",
    source: "SERVER_ORIGINAL",
    sourceLabelKey: "dashboard.library.card.agentSource",
    status: "AVAILABLE",
    titleKey: "dashboard.library.card.agentTitle",
    tone: "agent",
  },
  {
    countLabelKey: "dashboard.library.card.timerCount",
    descriptionKey: "dashboard.library.card.timerDesc",
    kind: "TIMER",
    source: "ACTIVITY_ROLLUP",
    sourceLabelKey: "dashboard.library.card.timerSource",
    status: "AVAILABLE",
    titleKey: "dashboard.library.card.timerTitle",
    tone: "timer",
  },
  {
    countLabelKey: "dashboard.library.card.resourceCount",
    descriptionKey: "dashboard.library.card.resourceDesc",
    kind: "RESOURCE",
    source: "SERVER_ORIGINAL",
    sourceLabelKey: "dashboard.library.card.resourceSource",
    status: "DISABLED",
    titleKey: "dashboard.library.card.resourceTitle",
    tone: "memo",
  },
];

export const defaultDashboardRules: DashboardRule[] = [
  {
    descriptionKey: "dashboard.library.rule.userBasisDesc",
    labelKey: "dashboard.library.rule.userBasisLabel",
    tone: "personal",
  },
  {
    descriptionKey: "dashboard.library.rule.permissionDesc",
    labelKey: "dashboard.library.rule.permissionLabel",
    tone: "approved",
  },
  {
    descriptionKey: "dashboard.library.rule.screenLinkDesc",
    labelKey: "dashboard.library.rule.screenLinkLabel",
    tone: "todo",
  },
];

export function DashboardCardLibraryPanel({
  cards,
  className,
  rules,
  selectedProjectRoomName,
  titleKey = "dashboard.library.title",
  ...props
}: DashboardCardLibraryPanelProps) {
  const { t } = useI18n();
  const addedCount = cards.filter((card) => card.status === "ADDED").length;
  const availableCount = cards.filter((card) => card.status === "AVAILABLE").length;
  const roomName = selectedProjectRoomName ?? t("dashboard.library.allRooms");

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<LayoutDashboard size={16} strokeWidth={2.1} />}>{t("dashboard.library.kicker")}</Chip>
          <div>
            <h2 className={styles.title}>{t(titleKey)}</h2>
            <p className={styles.description}>{t("dashboard.library.desc")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("dashboard.library.currentAdded")}</span>
          <strong>{t("dashboard.library.addedCount", { count: addedCount })}</strong>
          <StatusBadge tone="pending">{t("dashboard.library.availableCount", { count: availableCount })}</StatusBadge>
        </div>
      </header>

      <section className={styles.contextRow} aria-label={t("dashboard.library.contextAria")}>
        <article className={styles.contextCard}>
          <span className={styles.iconTile}>
            <PanelTop size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{roomName}</strong>
            <p>{t("dashboard.library.scopeHelper")}</p>
          </div>
        </article>
        <article className={styles.contextCard}>
          <span className={styles.iconTile}>
            <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("dashboard.library.permissionTitle")}</strong>
            <p>{t("dashboard.library.permissionHelper")}</p>
          </div>
        </article>
      </section>

      <section className={styles.cardGrid} aria-label={t("dashboard.library.cardsAria")}>
        {cards.map((card) => {
          const CardIcon = cardIcons[card.kind];
          const status = statusMeta[card.status];
          const disabled = card.status === "DISABLED";

          return (
            <article className={cn(styles.cardOption, disabled && styles.disabledCard)} key={card.kind}>
              <div className={styles.cardTop}>
                <span className={styles.iconTile}>
                  <CardIcon size={18} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <div className={styles.cardTitle}>
                  <strong>{t(card.titleKey)}</strong>
                  <span>{t(card.countLabelKey)}</span>
                </div>
                <span aria-hidden="true" className={styles.dragHandle}>
                  <Grip size={16} strokeWidth={2.1} />
                </span>
              </div>

              <p className={styles.cardDescription}>{t(card.descriptionKey)}</p>

              <div className={styles.cardMeta}>
                <StatusBadge tone={card.tone}>{t(sourceMeta[card.source])}</StatusBadge>
                <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
              </div>

              <footer className={styles.cardFooter}>
                <span>{t(card.sourceLabelKey)}</span>
                <Button
                  disabled={disabled}
                  icon={!disabled ? <Plus size={15} strokeWidth={2.2} /> : undefined}
                  size="sm"
                  variant={card.status === "ADDED" ? "quiet" : "secondary"}
                >
                  {t(status.actionKey)}
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.ruleGrid} aria-label={t("dashboard.library.rulesAria")}>
        {rules.map((rule) => (
          <article key={rule.labelKey}>
            <StatusBadge tone={rule.tone}>{t(rule.labelKey)}</StatusBadge>
            <p>{t(rule.descriptionKey)}</p>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
