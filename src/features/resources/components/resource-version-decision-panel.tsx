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
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
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

const versionStatusCopyKey: Record<ResourceVersionStatus, MessageKey> = {
  CURRENT: "resources.version.status.CURRENT",
  PENDING_REVIEW: "resources.version.status.PENDING_REVIEW",
  PREVIOUS: "resources.version.status.PREVIOUS",
};

const versionStatusTone: Record<ResourceVersionStatus, StatusTone> = {
  CURRENT: "approved",
  PENDING_REVIEW: "pending",
  PREVIOUS: "neutral",
};

const decisionCopyKey: Record<ResourceVersionDecision, { descriptionKey: MessageKey; labelKey: MessageKey }> = {
  CREATE_VERSION: {
    descriptionKey: "resources.version.decision.CREATE_VERSION.description",
    labelKey: "resources.version.decision.CREATE_VERSION.label",
  },
  HOLD_UPLOAD: {
    descriptionKey: "resources.version.decision.HOLD_UPLOAD.description",
    labelKey: "resources.version.decision.HOLD_UPLOAD.label",
  },
  KEEP_CURRENT: {
    descriptionKey: "resources.version.decision.KEEP_CURRENT.description",
    labelKey: "resources.version.decision.KEEP_CURRENT.label",
  },
};

type TranslateFn = (key: MessageKey) => string;

function buildDefaultVersions(t: TranslateFn): ResourceVersionItem[] {
  return [
    {
      authorLabel: t("resources.version.authorLeader"),
      changedAtLabel: "2026-06-18 15:20",
      fileName: t("resources.version.decisionFileV13"),
      id: "version-current",
      note: t("resources.version.decisionCurrentNote"),
      status: "CURRENT",
      versionLabel: "v3",
    },
    {
      authorLabel: t("resources.version.authorLeeSeoyeon"),
      changedAtLabel: "2026-06-16 11:42",
      fileName: t("resources.version.decisionFileV12"),
      id: "version-previous-2",
      note: t("resources.version.decisionPrev2Note"),
      status: "PREVIOUS",
      versionLabel: "v2",
    },
    {
      authorLabel: t("resources.version.authorLeader"),
      changedAtLabel: "2026-06-14 09:18",
      fileName: t("resources.version.decisionFileDraft"),
      id: "version-previous-1",
      note: t("resources.version.decisionPrev1Note"),
      status: "PREVIOUS",
      versionLabel: "v1",
    },
  ];
}

export function ResourceVersionDecisionPanel({
  className,
  currentFileName,
  incomingFileName,
  onChooseDecision,
  onOpenCurrent,
  onOpenIncoming,
  versions,
  visibility = "ROOM_SHARED",
}: ResourceVersionDecisionPanelProps) {
  const { t } = useI18n();
  const resolvedCurrentFileName = currentFileName ?? t("resources.version.decisionFileV13");
  const resolvedIncomingFileName = incomingFileName ?? t("resources.version.decisionFileV14");
  const VisibilityIcon = visibility === "ROOM_SHARED" ? UsersRound : FolderLock;
  const sortedVersions = versions ?? buildDefaultVersions(t);

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
            <strong>{resolvedCurrentFileName}</strong>
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
            <strong>{resolvedIncomingFileName}</strong>
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
            {(Object.keys(decisionCopyKey) as ResourceVersionDecision[]).map((decision) => {
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
                    <strong>{t(decisionCopyKey[decision].labelKey)}</strong>
                    <p>{t(decisionCopyKey[decision].descriptionKey)}</p>
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
                  <StatusBadge tone={versionStatusTone[version.status]}>{t(versionStatusCopyKey[version.status])}</StatusBadge>
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
