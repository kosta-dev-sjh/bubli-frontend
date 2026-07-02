"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileClock,
  FileText,
  FolderLock,
  History,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./resource-version-decision-panel.module.css";

export type ResourceVisibility = "PERSONAL" | "ROOM_SHARED";
export type ResourceVersionStatus = "CURRENT" | "PREVIOUS" | "PENDING_REVIEW";
export type ResourceVersionDecision = "CREATE_VERSION" | "KEEP_CURRENT" | "HOLD_UPLOAD";

export type ResourceVersionItem = {
  authorLabel: string;
  changedAtLabel: string;
  fileName: string;
  id: string;
  note: string;
  status: ResourceVersionStatus;
  versionLabel: string;
};

export type ResourceVersionDecisionPanelProps = {
  className?: string;
  currentFileName?: string;
  incomingFileName?: string;
  onChooseDecision?: (decision: ResourceVersionDecision) => void;
  onOpenCurrent?: () => void;
  onOpenIncoming?: () => void;
  versions?: ResourceVersionItem[];
  visibility?: ResourceVisibility;
};

const versionStatusCopy: Record<ResourceVersionStatus, MessageKey> = {
  CURRENT: "resources.version.status.CURRENT",
  PENDING_REVIEW: "resources.version.status.PENDING_REVIEW",
  PREVIOUS: "resources.version.status.PREVIOUS",
};

const versionStatusTone: Record<ResourceVersionStatus, StatusTone> = {
  CURRENT: "approved",
  PENDING_REVIEW: "pending",
  PREVIOUS: "neutral",
};

const decisionCopy: Record<ResourceVersionDecision, { description: MessageKey; label: MessageKey }> = {
  CREATE_VERSION: {
    description: "resources.version.decision.CREATE_VERSION.description",
    label: "resources.version.decision.CREATE_VERSION.label",
  },
  HOLD_UPLOAD: {
    description: "resources.version.decision.HOLD_UPLOAD.description",
    label: "resources.version.decision.HOLD_UPLOAD.label",
  },
  KEEP_CURRENT: {
    description: "resources.version.decision.KEEP_CURRENT.description",
    label: "resources.version.decision.KEEP_CURRENT.label",
  },
};

const defaultVersions: ResourceVersionItem[] = [
  {
    authorLabel: "김정현",
    changedAtLabel: "2026-06-18 15:20",
    fileName: "요구사항정의서_v1.3.pdf",
    id: "version-current",
    note: "WBS 후보 생성에 사용 중인 현재 자료입니다.",
    status: "CURRENT",
    versionLabel: "v3",
  },
  {
    authorLabel: "이서연",
    changedAtLabel: "2026-06-16 11:42",
    fileName: "요구사항정의서_v1.2.pdf",
    id: "version-previous-2",
    note: "검수 기준 문장이 추가되기 전 버전입니다.",
    status: "PREVIOUS",
    versionLabel: "v2",
  },
  {
    authorLabel: "김정현",
    changedAtLabel: "2026-06-14 09:18",
    fileName: "요구사항정의서_초안.pdf",
    id: "version-previous-1",
    note: "프로젝트룸 생성 시 처음 업로드한 자료입니다.",
    status: "PREVIOUS",
    versionLabel: "v1",
  },
];

export function ResourceVersionDecisionPanel({
  className,
  currentFileName = "요구사항정의서_v1.3.pdf",
  incomingFileName = "요구사항정의서_v1.4.pdf",
  onChooseDecision,
  onOpenCurrent,
  onOpenIncoming,
  versions = defaultVersions,
  visibility = "ROOM_SHARED",
}: ResourceVersionDecisionPanelProps) {
  const { t } = useI18n();
  const VisibilityIcon = visibility === "ROOM_SHARED" ? UsersRound : FolderLock;
  const sortedVersions = versions;

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<History size={14} />}>{t("resources.version.chip")}</Chip>
          <h2>{t("resources.version.title")}</h2>
          <p>{t("resources.version.description")}</p>
        </div>
        <StatusBadge tone={visibility === "ROOM_SHARED" ? "room" : "personal"}>
          {visibility === "ROOM_SHARED" ? t("resources.version.visibilityRoom") : t("resources.version.visibilityPersonal")}
        </StatusBadge>
      </header>

      <section className={styles.compareArea} aria-label={t("resources.version.compareAria")}>
        <article className={styles.fileCard}>
          <span className={styles.fileIcon} aria-hidden="true">
            <FileText size={20} strokeWidth={2.1} />
          </span>
          <div>
            <span>{t("resources.version.currentLabel")}</span>
            <strong>{currentFileName}</strong>
            <p>{t("resources.version.currentDesc")}</p>
          </div>
          <Button icon={<FileText size={15} />} onClick={onOpenCurrent} size="sm" variant="ghost">
            {t("resources.version.openCurrent")}
          </Button>
        </article>

        <span className={styles.compareArrow} aria-hidden="true">
          <ArrowRight size={20} strokeWidth={2.2} />
        </span>

        <article className={cn(styles.fileCard, styles.incomingCard)}>
          <span className={styles.fileIcon} aria-hidden="true">
            <UploadCloud size={20} strokeWidth={2.1} />
          </span>
          <div>
            <span>{t("resources.version.incomingLabel")}</span>
            <strong>{incomingFileName}</strong>
            <p>{t("resources.version.incomingDesc")}</p>
          </div>
          <Button icon={<FileClock size={15} />} onClick={onOpenIncoming} size="sm" variant="quiet">
            {t("resources.version.previewIncoming")}
          </Button>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.decisionPanel} aria-label={t("resources.version.decisionAria")}>
          <div className={styles.decisionHeader}>
            <span className={styles.policyIcon} aria-hidden="true">
              <VisibilityIcon size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("resources.version.decisionHeading")}</h3>
              <p>{t("resources.version.decisionDesc")}</p>
            </div>
          </div>

          <div className={styles.decisionList}>
            {(Object.keys(decisionCopy) as ResourceVersionDecision[]).map((decision) => {
              const isPrimary = decision === "CREATE_VERSION";
              const icon =
                decision === "CREATE_VERSION" ? (
                  <CheckCircle2 size={17} strokeWidth={2.1} />
                ) : decision === "KEEP_CURRENT" ? (
                  <RotateCcw size={17} strokeWidth={2.1} />
                ) : (
                  <Clock3 size={17} strokeWidth={2.1} />
                );

              return (
                <button
                  className={cn(styles.decisionButton, isPrimary && styles.decisionButtonPrimary)}
                  key={decision}
                  onClick={() => onChooseDecision?.(decision)}
                  type="button"
                >
                  <span aria-hidden="true">{icon}</span>
                  <div>
                    <strong>{t(decisionCopy[decision].label)}</strong>
                    <p>{t(decisionCopy[decision].description)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className={styles.historyPanel} aria-label={t("resources.version.historyAria")}>
          <div className={styles.historyHeader}>
            <span className={styles.policyIcon} aria-hidden="true">
              <ShieldCheck size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("resources.version.historyHeading")}</h3>
              <p>{t("resources.version.historyDesc")}</p>
            </div>
          </div>

          <ol className={styles.versionList}>
            {sortedVersions.map((version) => (
              <li key={version.id}>
                <div className={styles.versionTop}>
                  <span>{version.versionLabel}</span>
                  <StatusBadge tone={versionStatusTone[version.status]}>{t(versionStatusCopy[version.status])}</StatusBadge>
                </div>
                <strong>{version.fileName}</strong>
                <p>{version.note}</p>
                <small>
                  {version.authorLabel} · {version.changedAtLabel}
                </small>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </GlassPanel>
  );
}
