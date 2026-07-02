"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FolderCheck,
  FolderOpen,
  HardDrive,
  RefreshCcw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./managed-folder-policy-panel.module.css";

export type LocalFileSyncStatus =
  | "LOCAL_ONLY"
  | "SYNC_PENDING"
  | "SYNCED"
  | "CONFLICT"
  | "DELETE_CANDIDATE"
  | "STORAGE_LIMIT_EXCEEDED";

export type ManagedFolderMetric = {
  count: number;
  id: string;
  label?: string;
  labelKey?: MessageKey;
  status: LocalFileSyncStatus;
};

type ManagedFolderPolicyPanelProps = HTMLAttributes<HTMLElement> & {
  backupLabel?: string;
  folderAlias?: string;
  metrics?: ManagedFolderMetric[];
  onBackupNow?: () => void;
  onSelectFolder?: () => void;
  onSyncNow?: () => void;
  quotaLabel?: string;
  quotaPercent?: number;
  syncEnabled?: boolean;
};

const statusCopy: Record<LocalFileSyncStatus, MessageKey> = {
  LOCAL_ONLY: "folder.policy.statusLocalOnly",
  SYNC_PENDING: "folder.policy.statusSyncPending",
  SYNCED: "folder.policy.statusSynced",
  CONFLICT: "folder.policy.statusConflict",
  DELETE_CANDIDATE: "folder.policy.statusDeleteCandidate",
  STORAGE_LIMIT_EXCEEDED: "folder.policy.statusStorageLimit",
};

const statusTone: Record<LocalFileSyncStatus, "neutral" | "pending" | "success" | "warning"> = {
  LOCAL_ONLY: "neutral",
  SYNC_PENDING: "pending",
  SYNCED: "success",
  CONFLICT: "warning",
  DELETE_CANDIDATE: "warning",
  STORAGE_LIMIT_EXCEEDED: "warning",
};

const defaultMetrics: ManagedFolderMetric[] = [
  {
    count: 24,
    id: "local",
    labelKey: "folder.policy.metricLocal",
    status: "LOCAL_ONLY",
  },
  {
    count: 3,
    id: "pending",
    labelKey: "folder.policy.metricPending",
    status: "SYNC_PENDING",
  },
  {
    count: 18,
    id: "synced",
    labelKey: "folder.policy.metricSynced",
    status: "SYNCED",
  },
  {
    count: 1,
    id: "conflict",
    labelKey: "folder.policy.metricConflict",
    status: "CONFLICT",
  },
];

export function ManagedFolderPolicyPanel({
  backupLabel,
  className,
  folderAlias = "~/Documents/Bubli",
  metrics = defaultMetrics,
  onBackupNow,
  onSelectFolder,
  onSyncNow,
  quotaLabel,
  quotaPercent = 82,
  syncEnabled = true,
  ...props
}: ManagedFolderPolicyPanelProps) {
  const { t } = useI18n();
  const resolvedBackupLabel = backupLabel ?? t("folder.policy.backupLabel");
  const resolvedQuotaLabel = quotaLabel ?? t("folder.policy.quotaLabel");
  const pendingCount = metrics
    .filter((metric) => metric.status === "SYNC_PENDING" || metric.status === "CONFLICT")
    .reduce((sum, metric) => sum + metric.count, 0);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.mainIcon} aria-hidden="true">
            <FolderCheck size={22} />
          </span>
          <div>
            <StatusBadge tone={syncEnabled ? "success" : "neutral"}>{syncEnabled ? t("folder.policy.syncOn") : t("folder.policy.localOnly")}</StatusBadge>
            <h2>{t("folder.policy.title")}</h2>
            <p>{t("folder.policy.desc")}</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<FolderOpen size={15} />} onClick={onSelectFolder} size="sm" variant="quiet">
            {t("folder.policy.selectFolder")}
          </Button>
          <Button icon={<UploadCloud size={15} />} onClick={onSyncNow} size="sm" variant="primary">
            {t("folder.policy.applyPending")}
          </Button>
        </div>
      </header>

      <div className={styles.folderCard}>
        <div className={styles.folderIcon} aria-hidden="true">
          <HardDrive size={20} />
        </div>
        <div className={styles.folderBody}>
          <strong>{folderAlias}</strong>
          <span>{t("folder.policy.folderScope")}</span>
        </div>
        <Chip>{t("folder.policy.needsCheck", { count: pendingCount })}</Chip>
      </div>

      <div className={styles.metricGrid} aria-label={t("folder.policy.metricGridAria")}>
        {metrics.map((metric) => (
          <article className={styles.metricCard} key={metric.id}>
            <div>
              <strong>{metric.count}</strong>
              <span>{metric.labelKey ? t(metric.labelKey) : metric.label}</span>
            </div>
            <StatusBadge tone={statusTone[metric.status]}>{t(statusCopy[metric.status])}</StatusBadge>
          </article>
        ))}
      </div>

      <div className={styles.policyGrid}>
        <PolicyItem
          icon={<ShieldCheck size={17} />}
          label={t("folder.policy.accessLabel")}
          value={t("folder.policy.accessValue")}
        />
        <PolicyItem
          icon={<Database size={17} />}
          label={t("folder.policy.storageLabel")}
          value={t("folder.policy.storageValue")}
        />
        <PolicyItem
          icon={<AlertTriangle size={17} />}
          label={t("folder.policy.shareLabel")}
          value={t("folder.policy.shareValue")}
        />
      </div>

      <footer className={styles.footer}>
        <div className={styles.quota}>
          <div>
            <strong>{resolvedQuotaLabel}</strong>
            <span>{t("folder.policy.quotaOverDesc")}</span>
          </div>
          <span>{quotaPercent}%</span>
        </div>
        <ProgressBar label={t("folder.policy.usageLabel")} value={quotaPercent} />
        <div className={styles.backupRow}>
          <span>
            <CheckCircle2 size={15} />
            {resolvedBackupLabel}
          </span>
          <Button icon={<RefreshCcw size={14} />} onClick={onBackupNow} size="sm" variant="ghost">
            {t("folder.policy.createBackup")}
          </Button>
        </div>
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
