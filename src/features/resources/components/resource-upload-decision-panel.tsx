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
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./resource-upload-decision-panel.module.css";

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

const defaultOptionMeta: Array<{
  descriptionKey: MessageKey;
  icon: ReactNode;
  id: ResourceUploadDecision;
  labelKey: MessageKey;
  metaKey: MessageKey;
}> = [
  {
    descriptionKey: "resources.upload.decision.optionPersonalDesc",
    icon: <HardDrive size={18} />,
    id: "PERSONAL_LIBRARY",
    labelKey: "resources.upload.decision.optionPersonalLabel",
    metaKey: "resources.upload.decision.optionPersonalMeta",
  },
  {
    descriptionKey: "resources.upload.decision.optionRoomDesc",
    icon: <FolderInput size={18} />,
    id: "ROOM_RESOURCE",
    labelKey: "resources.upload.decision.optionRoomLabel",
    metaKey: "resources.upload.decision.optionRoomMeta",
  },
  {
    descriptionKey: "resources.upload.decision.optionTempDesc",
    icon: <MessageSquareText size={18} />,
    id: "TEMP_ANALYSIS",
    labelKey: "resources.upload.decision.optionTempLabel",
    metaKey: "resources.upload.decision.optionTempMeta",
  },
];

export function ResourceUploadDecisionPanel({
  className,
  currentDecision = "PERSONAL_LIBRARY",
  fileKindLabel = "PDF",
  fileName = "번역계약서_v2.pdf",
  fileSizeLabel = "2.4MB",
  onConfirmDecision,
  onSelectDecision,
  options,
  quotaLabel = "개인 자료함 820MB / 1GB",
  quotaPercent = 82,
  roomLabel = "토모에 번역 프로젝트룸",
  ...props
}: ResourceUploadDecisionPanelProps) {
  const { t } = useI18n();
  const resolvedOptions: ResourceDecisionOption[] =
    options ??
    defaultOptionMeta.map((option) => ({
      description: t(option.descriptionKey),
      icon: option.icon,
      id: option.id,
      label: t(option.labelKey),
      meta: t(option.metaKey),
    }));
  const selectedOption = resolvedOptions.find((option) => option.id === currentDecision) ?? resolvedOptions[0];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.mainIcon} aria-hidden="true">
            <UploadCloud size={22} />
          </span>
          <div>
            <StatusBadge tone="pending">{t("resources.upload.decision.badge")}</StatusBadge>
            <h2>{t("resources.upload.decision.title")}</h2>
            <p>{t("resources.upload.decision.desc")}</p>
          </div>
        </div>
        <Button icon={<CheckCircle2 size={15} />} onClick={() => onConfirmDecision?.(currentDecision)} size="sm" variant="primary">
          {t("resources.upload.decision.confirm")}
        </Button>
      </header>

      <div className={styles.fileCard}>
        <div className={styles.fileIcon} aria-hidden="true">
          <FileText size={20} />
        </div>
        <div className={styles.fileBody}>
          <strong>{fileName}</strong>
          <div className={styles.fileMeta}>
            <Chip>{fileKindLabel}</Chip>
            <Chip>{fileSizeLabel}</Chip>
            <Chip>{roomLabel}</Chip>
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
          label={t("resources.upload.decision.policyPermissionLabel")}
          value={
            currentDecision === "ROOM_RESOURCE"
              ? t("resources.upload.decision.policyPermissionRoom")
              : t("resources.upload.decision.policyPermissionPersonal")
          }
        />
        <PolicyItem
          icon={<Sparkles size={17} />}
          label={t("resources.upload.decision.policyAgentLabel")}
          value={
            currentDecision === "TEMP_ANALYSIS"
              ? t("resources.upload.decision.policyAgentTemp")
              : t("resources.upload.decision.policyAgentStored")
          }
        />
        <PolicyItem icon={<Database size={17} />} label={t("resources.upload.decision.policyStorageLabel")} value={selectedOption.meta} />
      </div>

      <footer className={styles.footer}>
        <div className={styles.quota}>
          <div>
            <strong>{quotaLabel}</strong>
            <span>{t("resources.upload.decision.quotaDesc")}</span>
          </div>
          <span>{quotaPercent}%</span>
        </div>
        <ProgressBar label={t("resources.upload.decision.quotaProgressLabel")} value={quotaPercent} />
        <p>{t("resources.upload.decision.footerNote")}</p>
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
