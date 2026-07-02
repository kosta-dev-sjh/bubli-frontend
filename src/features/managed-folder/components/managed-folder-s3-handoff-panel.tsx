"use client";

import {
  CheckCircle2,
  Cloud,
  Database,
  FileCheck2,
  FolderSync,
  HardDrive,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./managed-folder-s3-handoff-panel.module.css";

type FolderEventStatus = "INDEXED" | "UPLOAD_WAITING" | "REVIEW_NEEDED" | "LINKED";
type HandoffTarget = "PERSONAL_RESOURCE" | "ROOM_RESOURCE" | "NEW_VERSION";

type FolderEvent = {
  eventLabel: string;
  fileName: string;
  status: FolderEventStatus;
  target: HandoffTarget;
  updatedLabel: string;
};

type HandoffRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type ManagedFolderS3HandoffPanelProps = HTMLAttributes<HTMLElement> & {
  events: FolderEvent[];
  folderName: string;
  quotaPercent: number;
  rules: HandoffRule[];
  selectedProjectRoom: string;
  title?: string;
};

const statusMeta: Record<FolderEventStatus, { actionLabelKey: MessageKey; labelKey: MessageKey; tone: StatusTone }> = {
  INDEXED: { actionLabelKey: "folder.handoff.actionView", labelKey: "folder.handoff.statusIndexed", tone: "personal" },
  LINKED: { actionLabelKey: "folder.handoff.actionOpen", labelKey: "folder.handoff.statusLinked", tone: "approved" },
  REVIEW_NEEDED: { actionLabelKey: "folder.handoff.actionSelect", labelKey: "folder.handoff.statusReviewNeeded", tone: "warning" },
  UPLOAD_WAITING: { actionLabelKey: "folder.handoff.actionUpload", labelKey: "folder.handoff.statusWaiting", tone: "pending" },
};

const targetMeta: Record<HandoffTarget, { labelKey: MessageKey; tone: StatusTone }> = {
  NEW_VERSION: { labelKey: "folder.handoff.targetNewVersion", tone: "agent" },
  PERSONAL_RESOURCE: { labelKey: "folder.handoff.targetPersonal", tone: "personal" },
  ROOM_RESOURCE: { labelKey: "folder.handoff.targetRoom", tone: "room" },
};

export const defaultFolderEvents: FolderEvent[] = [
  {
    eventLabel: "파일 수정",
    fileName: "업무 기준 문서_v3.pdf",
    status: "REVIEW_NEEDED",
    target: "NEW_VERSION",
    updatedLabel: "오늘 11:08",
  },
  {
    eventLabel: "파일 추가",
    fileName: "회의 후 질문.md",
    status: "UPLOAD_WAITING",
    target: "PERSONAL_RESOURCE",
    updatedLabel: "오늘 10:42",
  },
  {
    eventLabel: "서버 반영",
    fileName: "요구사항 정리.docx",
    status: "LINKED",
    target: "ROOM_RESOURCE",
    updatedLabel: "어제 18:20",
  },
];

export const defaultFolderHandoffRules: HandoffRule[] = [
  {
    description: "데스크탑 앱은 사용자가 지정한 관리 폴더의 변경 상태를 기기 안 색인에 남깁니다.",
    label: "기기 안 색인",
    tone: "personal",
  },
  {
    description: "파일 업로드는 서버 권한 확인을 거친 뒤 자료보드에 연결됩니다.",
    label: "서버 업로드",
    tone: "room",
  },
  {
    description: "수정된 파일은 사용자가 새 버전으로 반영할지 선택한 뒤 버전 기록에 남깁니다.",
    label: "버전 선택",
    tone: "approved",
  },
];

export function ManagedFolderS3HandoffPanel({
  className,
  events,
  folderName,
  quotaPercent,
  rules,
  selectedProjectRoom,
  title,
  ...props
}: ManagedFolderS3HandoffPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("folder.handoff.title");
  const reviewCount = events.filter((event) => event.status === "REVIEW_NEEDED").length;
  const waitingCount = events.filter((event) => event.status === "UPLOAD_WAITING").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FolderSync size={16} strokeWidth={2.1} />}>{t("folder.handoff.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("folder.handoff.desc")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{folderName}</span>
          <strong>{selectedProjectRoom}</strong>
          <StatusBadge tone="warning">{t("folder.handoff.reviewBadge", { count: reviewCount })}</StatusBadge>
        </div>
      </header>

      <section className={styles.flowGrid} aria-label={t("folder.handoff.flowAria")}>
        <article className={styles.flowCard}>
          <span className={styles.iconTile}>
            <HardDrive size={19} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <StatusBadge tone="personal">{t("folder.handoff.deviceRecord")}</StatusBadge>
            <h3>{t("folder.handoff.managedFolder")}</h3>
            <p>{t("folder.handoff.managedFolderDesc")}</p>
          </div>
        </article>

        <article className={styles.centerCard}>
          <span className={styles.iconTile}>
            <ShieldCheck size={20} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <Chip selected>{t("folder.handoff.userSelect")}</Chip>
          <h3>{t("folder.handoff.applyTitle")}</h3>
          <p>{t("folder.handoff.applyDesc")}</p>
          <ProgressBar label={t("folder.handoff.quotaProgressLabel")} value={quotaPercent} />
          <Button icon={<RefreshCw size={15} strokeWidth={2.1} />} size="sm" variant="secondary">
            {t("folder.handoff.checkChanges")}
          </Button>
        </article>

        <article className={styles.flowCard}>
          <span className={styles.iconTile}>
            <Cloud size={19} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <StatusBadge tone="room">{t("folder.handoff.serverStore")}</StatusBadge>
            <h3>{t("folder.handoff.boardLink")}</h3>
            <p>{t("folder.handoff.boardLinkDesc")}</p>
          </div>
        </article>
      </section>

      <section className={styles.metrics} aria-label={t("folder.handoff.metricsAria")}>
        <article>
          <span>{t("folder.handoff.usageRate")}</span>
          <strong>{quotaPercent}%</strong>
          <StatusBadge tone={quotaPercent > 80 ? "warning" : "approved"}>{t("folder.handoff.checkLimit")}</StatusBadge>
        </article>
        <article>
          <span>{t("folder.handoff.uploadWaiting")}</span>
          <strong>{waitingCount}</strong>
          <StatusBadge tone="pending">{t("folder.handoff.selectNeeded")}</StatusBadge>
        </article>
        <article>
          <span>{t("folder.handoff.reviewNeeded")}</span>
          <strong>{reviewCount}</strong>
          <StatusBadge tone="warning">{t("folder.handoff.checkVersion")}</StatusBadge>
        </article>
      </section>

      <section className={styles.eventList} aria-label={t("folder.handoff.eventListAria")}>
        {events.map((event) => {
          const status = statusMeta[event.status];
          const target = targetMeta[event.target];

          return (
            <article className={styles.eventCard} key={`${event.fileName}-${event.updatedLabel}`}>
              <span className={styles.iconTile}>
                {event.status === "LINKED" ? (
                  <FileCheck2 size={18} strokeWidth={2.1} aria-hidden="true" />
                ) : (
                  <Database size={18} strokeWidth={2.1} aria-hidden="true" />
                )}
              </span>
              <div className={styles.eventMain}>
                <strong>{event.fileName}</strong>
                <span>
                  {event.eventLabel} · {event.updatedLabel}
                </span>
              </div>
              <StatusBadge tone={target.tone}>{t(target.labelKey)}</StatusBadge>
              <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
              <Button size="sm" variant={event.status === "REVIEW_NEEDED" ? "secondary" : "quiet"}>
                {t(status.actionLabelKey)}
              </Button>
            </article>
          );
        })}
      </section>

      <section className={styles.ruleGrid} aria-label={t("folder.handoff.ruleGridAria")}>
        {rules.map((rule) => (
          <article key={rule.label}>
            <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <StatusBadge tone={rule.tone}>{rule.label}</StatusBadge>
              <p>{rule.description}</p>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
