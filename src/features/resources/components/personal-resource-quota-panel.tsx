"use client";

import { AlertTriangle, Archive, Cloud, Database, FolderSync, HardDrive, Search, ShieldCheck } from "lucide-react";
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

import styles from "./personal-resource-quota-panel.module.css";

type LocalFileStatus = "LOCAL_ONLY" | "SYNC_PENDING" | "SYNCED" | "STORAGE_LIMIT_EXCEEDED";

type StorageUsage = {
  limitLabel: string;
  percent: number;
  remainingLabel: string;
  usedLabel: string;
};

type LocalFileItem = {
  filename: string;
  pathLabel: string;
  sizeLabel: string;
  status: LocalFileStatus;
};

type QuotaRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type PersonalResourceQuotaPanelProps = HTMLAttributes<HTMLElement> & {
  files: LocalFileItem[];
  rules: QuotaRule[];
  title?: string;
  usage: StorageUsage;
};

const statusMeta: Record<LocalFileStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  LOCAL_ONLY: { labelKey: "resources.quota.statusLocalOnly", tone: "personal" },
  STORAGE_LIMIT_EXCEEDED: { labelKey: "resources.quota.statusExceeded", tone: "warning" },
  SYNC_PENDING: { labelKey: "resources.quota.statusPending", tone: "pending" },
  SYNCED: { labelKey: "resources.quota.statusSynced", tone: "success" },
};

// Exported fixtures store message keys in label/description/path fields; the panel resolves them via t().
export const defaultStorageUsage: StorageUsage = {
  limitLabel: "1GB",
  percent: 82,
  remainingLabel: "resources.quota.usageRemaining",
  usedLabel: "resources.quota.usageUsed",
};

export const defaultQuotaFiles: LocalFileItem[] = [
  {
    filename: "resources.quota.file1Name",
    pathLabel: "resources.quota.file1Path",
    sizeLabel: "2.4MB",
    status: "SYNCED",
  },
  {
    filename: "resources.quota.file2Name",
    pathLabel: "resources.quota.file2Path",
    sizeLabel: "880KB",
    status: "LOCAL_ONLY",
  },
  {
    filename: "resources.quota.file3Name",
    pathLabel: "resources.quota.file3Path",
    sizeLabel: "120MB",
    status: "SYNC_PENDING",
  },
  {
    filename: "resources.quota.file4Name",
    pathLabel: "resources.quota.file4Path",
    sizeLabel: "260MB",
    status: "STORAGE_LIMIT_EXCEEDED",
  },
];

export const defaultQuotaRules: QuotaRule[] = [
  {
    description: "resources.quota.rule1Desc",
    label: "resources.quota.rule1Label",
    tone: "personal",
  },
  {
    description: "resources.quota.rule2Desc",
    label: "resources.quota.rule2Label",
    tone: "todo",
  },
  {
    description: "resources.quota.rule3Desc",
    label: "resources.quota.rule3Label",
    tone: "room",
  },
];

export function PersonalResourceQuotaPanel({
  className,
  files,
  rules,
  title,
  usage,
  ...props
}: PersonalResourceQuotaPanelProps) {
  const { t } = useI18n();
  const panelTitle = title ?? t("resources.quota.defaultTitle");
  const overLimitCount = files.filter((file) => file.status === "STORAGE_LIMIT_EXCEEDED").length;
  const pendingCount = files.filter((file) => file.status === "SYNC_PENDING").length;
  const usageTone: StatusTone = usage.percent >= 90 ? "warning" : usage.percent >= 75 ? "pending" : "success";

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<HardDrive size={16} strokeWidth={2.1} />}>{t("resources.quota.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{panelTitle}</h2>
            <p className={styles.description}>
              {t("resources.quota.description")}
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("resources.quota.freeTier")}</span>
          <strong>{usage.limitLabel}</strong>
          <StatusBadge tone={usageTone}>{usage.percent}%</StatusBadge>
        </div>
      </header>

      <section className={styles.usageGrid} aria-label={t("resources.quota.usageAria")}>
        <article className={styles.usageCard}>
          <div className={styles.usageTop}>
            <span className={styles.usageIcon}>
              <Archive size={18} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <div>
              <strong>{t(usage.usedLabel as MessageKey)}</strong>
              <p>{t(usage.remainingLabel as MessageKey)}</p>
            </div>
            <StatusBadge tone={usageTone}>{usage.percent}%</StatusBadge>
          </div>
          <ProgressBar className={cn(styles.progress, usageTone === "warning" && styles.progressWarning)} value={usage.percent} />
          <div className={styles.usageMeta}>
            <span>{t("resources.quota.serverStorage")}</span>
            <b>{usage.limitLabel}</b>
          </div>
        </article>

        <article className={styles.warningCard}>
          <AlertTriangle size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("resources.quota.overCount", { count: overLimitCount })}</strong>
            <p>{t("resources.quota.overDesc")}</p>
          </div>
        </article>

        <article className={styles.pendingCard}>
          <FolderSync size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("resources.quota.pendingCount", { count: pendingCount })}</strong>
            <p>{t("resources.quota.pendingDesc")}</p>
          </div>
        </article>
      </section>

      <section className={styles.fileGrid} aria-label={t("resources.quota.fileGridAria")}>
        <div className={styles.fileHeader}>
          <div>
            <strong>{t("resources.quota.fileHeader")}</strong>
            <p>{t("resources.quota.fileHeaderDesc")}</p>
          </div>
          <Button icon={<Search size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
            {t("resources.quota.findOnDevice")}
          </Button>
        </div>
        <div className={styles.fileStack}>
          {files.map((file) => {
            const status = statusMeta[file.status];

            return (
              <article className={cn(styles.fileRow, file.status === "STORAGE_LIMIT_EXCEEDED" && styles.blocked)} key={file.filename}>
                <span className={styles.fileIcon}>
                  <Database size={16} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <span className={styles.fileCopy}>
                  <b>{t(file.filename as MessageKey)}</b>
                  <span>{t(file.pathLabel as MessageKey)}</span>
                </span>
                <span className={styles.fileSize}>{file.sizeLabel}</span>
                <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.ruleGrid} aria-label={t("resources.quota.ruleGridAria")}>
        {rules.map((rule) => (
          <article key={rule.label}>
            <ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <strong>{t(rule.label as MessageKey)}</strong>
              <p>{t(rule.description as MessageKey)}</p>
              <StatusBadge tone={rule.tone}>{t("resources.quota.rulePolicy")}</StatusBadge>
            </div>
          </article>
        ))}
      </section>

      <footer className={styles.footer}>
        <Button icon={<Cloud size={15} strokeWidth={2.1} />} size="sm" variant="primary">
          {t("resources.quota.checkSyncTargets")}
        </Button>
        <Button icon={<ShieldCheck size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          {t("resources.quota.goToShareApproval")}
        </Button>
      </footer>
    </GlassPanel>
  );
}
