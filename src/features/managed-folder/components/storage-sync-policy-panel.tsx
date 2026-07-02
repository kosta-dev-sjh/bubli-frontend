"use client";

import {
  CheckCircle2,
  Cloud,
  Database,
  FolderSearch,
  HardDrive,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { Chip, GlassPanel, ProgressBar, StatusBadge } from "@/components/ui";
import type { StatusTone } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";

import styles from "./storage-sync-policy-panel.module.css";

const storageUsage = {
  usedGb: 0.72,
  limitGb: 1,
  percent: 72,
};

type MetricId = "server" | "local" | "sync";

const metrics: {
  id: MetricId;
  titleKey: MessageKey;
  captionKey: MessageKey;
  value: string;
  suffixKey: MessageKey;
  icon: typeof HardDrive;
  badgeKey: MessageKey;
  tone: StatusTone;
}[] = [
  {
    id: "server",
    titleKey: "folder.storage.metricServerTitle",
    captionKey: "folder.storage.metricServerCaption",
    value: `${storageUsage.usedGb}GB`,
    suffixKey: "folder.storage.metricServerSuffix",
    icon: HardDrive,
    badgeKey: "folder.storage.metricServerBadge",
    tone: "pending",
  },
  {
    id: "local",
    titleKey: "folder.storage.metricLocalTitle",
    captionKey: "folder.storage.metricLocalCaption",
    value: "284",
    suffixKey: "folder.storage.metricLocalSuffix",
    icon: FolderSearch,
    badgeKey: "folder.storage.metricLocalBadge",
    tone: "personal",
  },
  {
    id: "sync",
    titleKey: "folder.storage.metricSyncTitle",
    captionKey: "folder.storage.metricSyncCaption",
    value: "12",
    suffixKey: "folder.storage.metricSyncSuffix",
    icon: UploadCloud,
    badgeKey: "folder.storage.metricSyncBadge",
    tone: "warning",
  },
];

const syncStatuses: { nameKey: MessageKey; descKey: MessageKey; tone: StatusTone }[] = [
  { nameKey: "folder.storage.statusLocalName", descKey: "folder.storage.statusLocalDesc", tone: "pending" },
  { nameKey: "folder.storage.statusPendingName", descKey: "folder.storage.statusPendingDesc", tone: "pending" },
  { nameKey: "folder.storage.statusDoneName", descKey: "folder.storage.statusDoneDesc", tone: "success" },
  { nameKey: "folder.storage.statusDeleteName", descKey: "folder.storage.statusDeleteDesc", tone: "pending" },
  { nameKey: "folder.storage.statusOverName", descKey: "folder.storage.statusOverDesc", tone: "warning" },
];

const safetyRuleKeys: MessageKey[] = [
  "folder.storage.safetyScope",
  "folder.storage.safetyQuota",
  "folder.storage.safetyDelete",
  "folder.storage.safetyRoom",
];

const connectionRows: { labelKey: MessageKey; pathKey: MessageKey; path: string }[] = [
  { labelKey: "folder.storage.connServerLabel", pathKey: "folder.storage.connServerPath", path: "/api/storage/usage" },
  { labelKey: "folder.storage.connLocalLabel", pathKey: "folder.storage.connLocalPath", path: "Tauri IPC와 SQLite" },
  { labelKey: "folder.storage.connApplyLabel", pathKey: "folder.storage.connApplyPath", path: "localsync 구현 후 연결" },
];

export function StorageSyncPolicyPanel() {
  const { t } = useI18n();

  return (
    <GlassPanel className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <ShieldCheck size={16} aria-hidden="true" />
          {t("folder.storage.eyebrow")}
        </div>
        <div className={styles.titleArea}>
          <h2 className={styles.title}>{t("folder.storage.title")}</h2>
          <p className={styles.summary}>{t("folder.storage.summary")}</p>
        </div>
        <div className={styles.chips} aria-label={t("folder.storage.chipsAria")}>
          <Chip selected icon={<Database size={14} aria-hidden="true" />}>
            {t("folder.storage.chipIndex")}
          </Chip>
          <Chip icon={<Cloud size={14} aria-hidden="true" />}>{t("folder.storage.chipServer")}</Chip>
          <Chip icon={<ShieldCheck size={14} aria-hidden="true" />}>{t("folder.storage.chipConfirm")}</Chip>
        </div>
      </header>

      <section className={styles.summaryGrid} aria-label={t("folder.storage.summaryGridAria")}>
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article className={styles.metricCard} key={metric.id}>
              <div className={styles.metricTop}>
                <span className={styles.iconBubble}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <StatusBadge tone={metric.tone}>{t(metric.badgeKey)}</StatusBadge>
              </div>
              <div className={styles.metricLabel}>
                <h3>{t(metric.titleKey)}</h3>
                <p>{t(metric.captionKey)}</p>
              </div>
              <div>
                <div className={styles.metricValue}>
                  <strong>{metric.value}</strong>
                  <span>{t(metric.suffixKey)}</span>
                </div>
                {metric.id === "server" ? (
                  <>
                    <ProgressBar label={t("folder.storage.serverUsageProgress")} value={storageUsage.percent} />
                    <div className={styles.usageText}>
                      <span>{t("folder.storage.usageRate", { percent: storageUsage.percent })}</span>
                      <span>{t("folder.storage.remaining", { value: (storageUsage.limitGb - storageUsage.usedGb).toFixed(2) })}</span>
                    </div>
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.statusSection} aria-label={t("folder.storage.statusSectionAria")}>
        <div className={styles.sectionTitle}>
          <div>
            <h3>{t("folder.storage.statusSectionTitle")}</h3>
            <p>{t("folder.storage.statusSectionDesc")}</p>
          </div>
          <StatusBadge tone="approved">{t("folder.storage.sameStandard")}</StatusBadge>
        </div>
        <div className={styles.statusGrid}>
          {syncStatuses.map((status) => (
            <article className={styles.statusCard} key={status.nameKey}>
              <StatusBadge tone={status.tone}>{t(status.nameKey)}</StatusBadge>
              <strong>{t(status.nameKey)}</strong>
              <span>{t(status.descKey)}</span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.policyGrid} aria-label={t("folder.storage.policyGridAria")}>
        <article className={styles.policyCard}>
          <h3>{t("folder.storage.safetyTitle")}</h3>
          <ul className={styles.checks}>
            {safetyRuleKeys.map((ruleKey) => (
              <li className={styles.checkItem} key={ruleKey}>
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>{t(ruleKey)}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className={styles.policyCard}>
          <h3>{t("folder.storage.boundaryTitle")}</h3>
          <div className={styles.apiList}>
            {connectionRows.map((row) => (
              <div className={styles.apiRow} key={row.labelKey}>
                <StatusBadge tone={row.path.startsWith("/api") ? "success" : "pending"}>{t(row.labelKey)}</StatusBadge>
                <span className={styles.apiPath}>{t(row.pathKey)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </GlassPanel>
  );
}
