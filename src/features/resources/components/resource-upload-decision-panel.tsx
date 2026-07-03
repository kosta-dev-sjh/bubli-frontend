"use client";

import {
  CheckCircle2,
  Database,
  FileText,
  FolderInput,
  HardDrive,
  LockKeyhole,
  MessageSquareText,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./resource-upload-decision-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

export type ResourceUploadDecision = "PERSONAL_LIBRARY" | "ROOM_RESOURCE" | "TEMP_ANALYSIS";

export type ResourceDecisionOption = {
  description: string;
  disabled?: boolean;
  id: ResourceUploadDecision;
  icon?: ReactNode;
  label: string;
  meta: string;
};

type ResourceUploadDecisionPanelProps = HTMLAttributes<HTMLElement> & {
  currentDecision?: ResourceUploadDecision;
  fileKindLabel?: string;
  fileName?: string;
  fileSizeLabel?: string;
  onConfirmDecision?: (decision: ResourceUploadDecision) => void;
  onSelectDecision?: (decision: ResourceUploadDecision) => void;
  options?: ResourceDecisionOption[];
  quotaLabel?: string;
  quotaPercent?: number;
  roomLabel?: string;
};

function buildDefaultOptions(t: TranslateFn): ResourceDecisionOption[] {
  return [
    {
      description: t("resources.upload.optPersonalDesc"),
      icon: <HardDrive size={18} />,
      id: "PERSONAL_LIBRARY",
      label: t("resources.upload.optPersonalLabel"),
      meta: t("resources.upload.optPersonalMeta"),
    },
    {
      description: t("resources.upload.optRoomDesc"),
      icon: <FolderInput size={18} />,
      id: "ROOM_RESOURCE",
      label: t("resources.upload.optRoomLabel"),
      meta: t("resources.upload.optRoomMeta"),
    },
    {
      description: t("resources.upload.optTempDesc"),
      icon: <MessageSquareText size={18} />,
      id: "TEMP_ANALYSIS",
      label: t("resources.upload.optTempLabel"),
      meta: t("resources.upload.optTempMeta"),
    },
  ];
}

export function ResourceUploadDecisionPanel({
  className,
  currentDecision = "PERSONAL_LIBRARY",
  fileKindLabel = "PDF",
  fileName,
  fileSizeLabel = "2.4MB",
  onConfirmDecision,
  onSelectDecision,
  options,
  quotaLabel,
  quotaPercent = 82,
  roomLabel,
  ...props
}: ResourceUploadDecisionPanelProps) {
  const { t } = useI18n();
  const resolvedOptions = options ?? buildDefaultOptions(t);
  const resolvedFileName = fileName ?? t("resources.upload.defaultFileName");
  const resolvedQuotaLabel = quotaLabel ?? t("resources.upload.defaultQuota");
  const resolvedRoomLabel = roomLabel ?? t("resources.upload.defaultRoomLabel");
  const selectedOption = resolvedOptions.find((option) => option.id === currentDecision) ?? resolvedOptions[0];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.mainIcon} aria-hidden="true">
            <UploadCloud size={22} />
          </span>
          <div>
            <StatusBadge tone="pending">{t("resources.upload.panelBadge")}</StatusBadge>
            <h2>{t("resources.upload.panelTitle")}</h2>
            <p>{t("resources.upload.panelDesc")}</p>
          </div>
        </div>
        <Button icon={<CheckCircle2 size={15} />} onClick={() => onConfirmDecision?.(currentDecision)} size="sm" variant="primary">
          {t("resources.upload.applySelection")}
        </Button>
      </header>

      <div className={styles.fileCard}>
        <div className={styles.fileIcon} aria-hidden="true">
          <FileText size={20} />
        </div>
        <div className={styles.fileBody}>
          <strong>{resolvedFileName}</strong>
          <div className={styles.fileMeta}>
            <Chip>{fileKindLabel}</Chip>
            <Chip>{fileSizeLabel}</Chip>
            <Chip>{resolvedRoomLabel}</Chip>
          </div>
        </div>
      </div>

      <div className={styles.optionGrid} role="list">
        {resolvedOptions.map((option) => {
          const selected = option.id === currentDecision;

          return (
            <button
              aria-pressed={selected}
              className={cn(styles.optionCard, selected && styles.optionCardSelected)}
              disabled={option.disabled}
              key={option.id}
              onClick={() => onSelectDecision?.(option.id)}
              type="button"
            >
              <span className={styles.optionIcon} aria-hidden="true">
                {option.icon}
              </span>
              <span className={styles.optionText}>
                <strong>{option.label}</strong>
                <span>{option.description}</span>
                <em>{option.meta}</em>
              </span>
              {selected ? <CheckCircle2 aria-hidden="true" className={styles.checkIcon} size={18} /> : null}
            </button>
          );
        })}
      </div>

      <div className={styles.policyGrid}>
        <PolicyItem
          icon={<LockKeyhole size={17} />}
          label={t("resources.upload.policyAuthLabel")}
          value={
            currentDecision === "ROOM_RESOURCE"
              ? t("resources.upload.policyAuthRoom")
              : t("resources.upload.policyAuthPersonal")
          }
        />
        <PolicyItem
          icon={<Sparkles size={17} />}
          label={t("resources.upload.policyAgentLabel")}
          value={
            currentDecision === "TEMP_ANALYSIS"
              ? t("resources.upload.policyAgentTemp")
              : t("resources.upload.policyAgentStored")
          }
        />
        <PolicyItem icon={<Database size={17} />} label={t("resources.upload.policyStorageLabel")} value={selectedOption.meta} />
      </div>

      <footer className={styles.footer}>
        <div className={styles.quota}>
          <div>
            <strong>{resolvedQuotaLabel}</strong>
            <span>{t("resources.upload.quotaHint")}</span>
          </div>
          <span>{quotaPercent}%</span>
        </div>
        <ProgressBar label={t("resources.upload.quotaBar")} value={quotaPercent} />
        <p>
          {t("resources.upload.panelFooter")}
        </p>
      </footer>
    </GlassPanel>
  );
}

function PolicyItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className={styles.policyItem}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{label}</strong>
        <p>{value}</p>
      </div>
    </div>
  );
}
