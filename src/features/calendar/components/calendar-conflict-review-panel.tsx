"use client";

import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ListTodo,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./calendar-conflict-review-panel.module.css";

type CalendarConflictStatus = "MATCHED" | "NEEDS_REVIEW" | "BLOCKED";
type CalendarConflictKind = "TIME" | "TITLE" | "TASK_LINK" | "ROOM_SCOPE";

type CalendarConflict = {
  bubliValue: string;
  googleValue: string;
  kind: CalendarConflictKind;
  projectRoomName: string;
  status: CalendarConflictStatus;
  title: string;
};

type CalendarReviewRule = {
  descriptionKey: MessageKey;
  labelKey: MessageKey;
  tone: StatusTone;
};

export type CalendarConflictReviewPanelProps = HTMLAttributes<HTMLElement> & {
  conflicts: CalendarConflict[];
  lastSyncedLabel: string;
  rules: CalendarReviewRule[];
  title?: string;
};

const conflictIcons: Record<CalendarConflictKind, typeof Clock3> = {
  ROOM_SCOPE: ShieldCheck,
  TASK_LINK: ListTodo,
  TIME: Clock3,
  TITLE: CalendarClock,
};

const statusMeta: Record<CalendarConflictStatus, { actionLabelKey: MessageKey; labelKey: MessageKey; tone: StatusTone }> = {
  BLOCKED: { actionLabelKey: "calendar.conflict.status.blocked.action", labelKey: "calendar.conflict.status.blocked.label", tone: "warning" },
  MATCHED: { actionLabelKey: "calendar.conflict.status.matched.action", labelKey: "calendar.conflict.status.matched.label", tone: "approved" },
  NEEDS_REVIEW: { actionLabelKey: "calendar.conflict.status.needsReview.action", labelKey: "calendar.conflict.status.needsReview.label", tone: "pending" },
};

export const defaultCalendarConflicts: CalendarConflict[] = [
  {
    bubliValue: "6월 24일 14:00",
    googleValue: "6월 24일 15:00",
    kind: "TIME",
    projectRoomName: "번역 프로젝트룸",
    status: "NEEDS_REVIEW",
    title: "1차 번역 검토",
  },
  {
    bubliValue: "클라이언트 확인 질문 보내기",
    googleValue: "질문 정리 미팅",
    kind: "TITLE",
    projectRoomName: "신규 웹사이트 구축",
    status: "NEEDS_REVIEW",
    title: "질문 초안 확인",
  },
  {
    bubliValue: "TODO 2개 연결",
    googleValue: "연결된 작업 없음",
    kind: "TASK_LINK",
    projectRoomName: "Bubli 제품 개발룸",
    status: "MATCHED",
    title: "WBS 리뷰",
  },
  {
    bubliValue: "프로젝트룸 일정",
    googleValue: "개인 캘린더 일정",
    kind: "ROOM_SCOPE",
    projectRoomName: "디자인 검토 프로젝트룸",
    status: "BLOCKED",
    title: "외부 미팅",
  },
];

export const defaultCalendarReviewRules: CalendarReviewRule[] = [
  {
    descriptionKey: "calendar.conflict.rule.serverSource.description",
    labelKey: "calendar.conflict.rule.serverSource.label",
    tone: "room",
  },
  {
    descriptionKey: "calendar.conflict.rule.userConfirm.description",
    labelKey: "calendar.conflict.rule.userConfirm.label",
    tone: "approved",
  },
  {
    descriptionKey: "calendar.conflict.rule.permission.description",
    labelKey: "calendar.conflict.rule.permission.label",
    tone: "warning",
  },
];

export function CalendarConflictReviewPanel({
  className,
  conflicts,
  lastSyncedLabel,
  rules,
  title,
  ...props
}: CalendarConflictReviewPanelProps) {
  const { t } = useI18n();
  const reviewCount = conflicts.filter((conflict) => conflict.status !== "MATCHED").length;
  const matchedCount = conflicts.length - reviewCount;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<CalendarDays size={16} strokeWidth={2.1} />}>{t("calendar.conflict.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{title ?? t("calendar.conflict.panelTitle")}</h2>
            <p className={styles.description}>{t("calendar.conflict.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("calendar.conflict.reviewNeeded")}</span>
          <strong>{t("calendar.conflict.reviewCount", { count: reviewCount })}</strong>
          <StatusBadge tone="approved">{t("calendar.conflict.matchedCount", { count: matchedCount })}</StatusBadge>
        </div>
      </header>

      <section className={styles.syncCard} aria-label={t("calendar.conflict.syncCard.aria")}>
        <span className={styles.iconTile}>
          <RefreshCw size={18} strokeWidth={2.1} aria-hidden="true" />
        </span>
        <div>
          <strong>{t("calendar.conflict.lastChecked")}</strong>
          <p>{lastSyncedLabel}</p>
        </div>
        <Button icon={<ExternalLink size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          {t("calendar.conflict.viewConnection")}
        </Button>
      </section>

      <section className={styles.conflictList} aria-label={t("calendar.conflict.list.aria")}>
        {conflicts.map((conflict) => {
          const ConflictIcon = conflictIcons[conflict.kind];
          const status = statusMeta[conflict.status];

          return (
            <article
              className={cn(styles.conflictCard, conflict.status !== "MATCHED" && styles.reviewCard)}
              key={`${conflict.projectRoomName}-${conflict.title}-${conflict.kind}`}
            >
              <div className={styles.conflictTop}>
                <span className={styles.iconTile}>
                  <ConflictIcon size={18} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <div className={styles.conflictTitle}>
                  <strong>{conflict.title}</strong>
                  <span>{conflict.projectRoomName}</span>
                </div>
                <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
              </div>

              <div className={styles.valueGrid}>
                <div>
                  <span>Bubli</span>
                  <b>{conflict.bubliValue}</b>
                </div>
                <div>
                  <span>Google Calendar</span>
                  <b>{conflict.googleValue}</b>
                </div>
              </div>

              <footer className={styles.conflictFooter}>
                <span>
                  <AlertTriangle size={15} strokeWidth={2.1} aria-hidden="true" />
                  {conflict.kind.toLowerCase()}
                </span>
                <Button size="sm" variant={conflict.status === "MATCHED" ? "ghost" : "quiet"}>
                  {t(status.actionLabelKey)}
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.ruleGrid} aria-label={t("calendar.conflict.rules.aria")}>
        {rules.map((rule) => (
          <article key={rule.labelKey}>
            <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <StatusBadge tone={rule.tone}>{t(rule.labelKey)}</StatusBadge>
              <p>{t(rule.descriptionKey)}</p>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
