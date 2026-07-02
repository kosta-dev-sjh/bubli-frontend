"use client";

import {
  ArchiveRestore,
  CheckCircle2,
  Cloud,
  DatabaseBackup,
  HardDrive,
  LockKeyhole,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey, TranslateVars } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./device-data-recovery-map-panel.module.css";

type TranslateFn = (key: MessageKey, vars?: TranslateVars) => string;

type RecoverySource = "SERVER" | "LOCAL_BACKUP" | "CACHE_REBUILD" | "NOT_RECOVERABLE";
type RecoveryHealth = "SAFE" | "ATTENTION" | "RISK";

type RecoveryItem = {
  descriptionKey: MessageKey;
  labelKey: MessageKey;
  source: RecoverySource;
  health: RecoveryHealth;
  lastCheckedKey: MessageKey;
};

type BackupSnapshot = {
  labelKey: MessageKey;
  valueKey: MessageKey;
  tone: StatusTone;
};

export type DeviceDataRecoveryMapPanelProps = HTMLAttributes<HTMLElement> & {
  backupSnapshots: BackupSnapshot[];
  items: RecoveryItem[];
  title?: string;
};

const sourceMeta: Record<RecoverySource, { labelKey: MessageKey; tone: StatusTone; icon: typeof Cloud }> = {
  CACHE_REBUILD: { icon: RefreshCcw, labelKey: "settings.dr.source.cacheRebuild", tone: "pending" },
  LOCAL_BACKUP: { icon: DatabaseBackup, labelKey: "settings.dr.source.localBackup", tone: "personal" },
  NOT_RECOVERABLE: { icon: ShieldAlert, labelKey: "settings.dr.source.notRecoverable", tone: "warning" },
  SERVER: { icon: Cloud, labelKey: "settings.dr.source.server", tone: "approved" },
};

const healthMeta: Record<RecoveryHealth, { labelKey: MessageKey; tone: StatusTone }> = {
  ATTENTION: { labelKey: "settings.dr.health.attention", tone: "pending" },
  RISK: { labelKey: "settings.dr.health.risk", tone: "warning" },
  SAFE: { labelKey: "settings.dr.health.safe", tone: "success" },
};

export const defaultRecoveryItems: RecoveryItem[] = [
  {
    descriptionKey: "settings.dr.item.room.desc",
    health: "SAFE",
    labelKey: "settings.dr.item.room.label",
    lastCheckedKey: "settings.dr.item.room.checked",
    source: "SERVER",
  },
  {
    descriptionKey: "settings.dr.item.recent.desc",
    health: "SAFE",
    labelKey: "settings.dr.item.recent.label",
    lastCheckedKey: "settings.dr.item.recent.checked",
    source: "CACHE_REBUILD",
  },
  {
    descriptionKey: "settings.dr.item.personal.desc",
    health: "ATTENTION",
    labelKey: "settings.dr.item.personal.label",
    lastCheckedKey: "settings.dr.item.personal.checked",
    source: "LOCAL_BACKUP",
  },
  {
    descriptionKey: "settings.dr.item.widget.desc",
    health: "RISK",
    labelKey: "settings.dr.item.widget.label",
    lastCheckedKey: "settings.dr.item.widget.checked",
    source: "NOT_RECOVERABLE",
  },
];

export const defaultBackupSnapshots: BackupSnapshot[] = [
  { labelKey: "settings.dr.snap.recent.label", tone: "approved", valueKey: "settings.dr.snap.recent.value" },
  { labelKey: "settings.dr.snap.stored.label", tone: "personal", valueKey: "settings.dr.snap.stored.value" },
  { labelKey: "settings.dr.snap.queue.label", tone: "pending", valueKey: "settings.dr.snap.queue.value" },
  { labelKey: "settings.dr.snap.integrity.label", tone: "success", valueKey: "settings.dr.snap.integrity.value" },
];

export function DeviceDataRecoveryMapPanel({
  backupSnapshots,
  className,
  items,
  title,
  ...props
}: DeviceDataRecoveryMapPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("settings.dr.title");
  const safeCount = items.filter((item) => item.health === "SAFE").length;
  const riskCount = items.filter((item) => item.health === "RISK").length;
  const safePercent = Math.round((safeCount / items.length) * 100);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<ArchiveRestore size={16} strokeWidth={2.1} />}>{t("settings.dr.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("settings.dr.desc")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("settings.dr.safety")}</span>
          <strong>{safePercent}%</strong>
          <StatusBadge tone={riskCount > 0 ? "warning" : "success"}>{t("settings.dr.riskCount", { count: riskCount })}</StatusBadge>
        </div>
      </header>

      <section className={styles.snapshotGrid} aria-label={t("settings.dr.snapshotAria")}>
        {backupSnapshots.map((snapshot) => (
          <article key={snapshot.labelKey}>
            <span>{t(snapshot.labelKey)}</span>
            <strong>{t(snapshot.valueKey)}</strong>
            <StatusBadge tone={snapshot.tone}>{t("settings.dr.snapshotBadge")}</StatusBadge>
          </article>
        ))}
      </section>

      <section className={styles.recoveryList} aria-label={t("settings.dr.listAria")}>
        {items.map((item) => {
          const source = sourceMeta[item.source];
          const health = healthMeta[item.health];
          const Icon = source.icon;

          return (
            <article className={cn(styles.recoveryItem, item.health === "RISK" && styles.riskyItem)} key={item.labelKey}>
              <span className={styles.iconTile}>
                <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div className={styles.itemCopy}>
                <div className={styles.itemTop}>
                  <strong>{t(item.labelKey)}</strong>
                  <div className={styles.badges}>
                    <StatusBadge tone={source.tone}>{t(source.labelKey)}</StatusBadge>
                    <StatusBadge tone={health.tone}>{t(health.labelKey)}</StatusBadge>
                  </div>
                </div>
                <p>{t(item.descriptionKey)}</p>
                <small>{t(item.lastCheckedKey)}</small>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.policyGrid} aria-label={t("settings.dr.policyAria")}>
        <article>
          <Cloud size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("settings.dr.policy.server.title")}</strong>
            <p>{t("settings.dr.policy.server.body")}</p>
          </div>
        </article>
        <article>
          <HardDrive size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("settings.dr.policy.local.title")}</strong>
            <p>{t("settings.dr.policy.local.body")}</p>
          </div>
        </article>
        <article>
          <LockKeyhole size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("settings.dr.policy.none.title")}</strong>
            <p>{t("settings.dr.policy.none.body")}</p>
          </div>
        </article>
      </section>

      <footer className={styles.footer}>
        <div className={styles.notice}>
          <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("settings.dr.footerNote")}</span>
        </div>
        <div className={styles.actions}>
          <Button icon={<RefreshCcw size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
            {t("settings.dr.checkIntegrity")}
          </Button>
          <Button icon={<CheckCircle2 size={15} strokeWidth={2.1} />} size="sm" variant="primary">
            {t("settings.dr.createBackup")}
          </Button>
        </div>
      </footer>
    </GlassPanel>
  );
}
