"use client";

import { AlertTriangle, Cloud, Database, Download, HardDrive, ShieldCheck } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./storage-provider-policy-panel.module.css";

type StoragePolicyStatus = "ready" | "checking" | "limited" | "blocked";

type StoragePolicyStep = {
  description: string;
  label: string;
  status: StoragePolicyStatus;
  value: string;
};

export type StorageProviderPolicyPanelProps = HTMLAttributes<HTMLElement> & {
  currentProviderLabel: string;
  downloadRuleLabel: string;
  failureReason?: string;
  limitLabel: string;
  steps: StoragePolicyStep[];
  title?: string;
  usageLabel: string;
  usagePercent: number;
};

const statusMeta: Record<StoragePolicyStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  ready: { labelKey: "resources.storage.statusReady", tone: "success" },
  checking: { labelKey: "resources.storage.statusChecking", tone: "pending" },
  limited: { labelKey: "resources.storage.statusLimited", tone: "warning" },
  blocked: { labelKey: "resources.storage.statusBlocked", tone: "warning" },
};

const policyCards: Array<{
  descriptionKey: MessageKey;
  icon: ReactNode;
  labelKey: MessageKey;
}> = [
  {
    descriptionKey: "resources.storage.policyDeviceDesc",
    icon: <HardDrive size={18} strokeWidth={2.1} />,
    labelKey: "resources.storage.policyDeviceLabel",
  },
  {
    descriptionKey: "resources.storage.policyServerDesc",
    icon: <Cloud size={18} strokeWidth={2.1} />,
    labelKey: "resources.storage.policyServerLabel",
  },
  {
    descriptionKey: "resources.storage.policyAuthDesc",
    icon: <ShieldCheck size={18} strokeWidth={2.1} />,
    labelKey: "resources.storage.policyAuthLabel",
  },
  {
    descriptionKey: "resources.storage.policyIssueDesc",
    icon: <Download size={18} strokeWidth={2.1} />,
    labelKey: "resources.storage.policyIssueLabel",
  },
];

export function StorageProviderPolicyPanel({
  className,
  currentProviderLabel,
  downloadRuleLabel,
  failureReason,
  limitLabel,
  steps,
  title,
  usageLabel,
  usagePercent,
  ...props
}: StorageProviderPolicyPanelProps) {
  const { t } = useI18n();
  const panelTitle = title ?? t("resources.storage.defaultTitle");
  const safeUsagePercent = Math.max(0, Math.min(100, usagePercent));
  const usageTone = safeUsagePercent >= 100 ? "warning" : safeUsagePercent >= 80 ? "pending" : "success";

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Database size={14} strokeWidth={2.1} />}>{t("resources.storage.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{panelTitle}</h2>
            <p className={styles.description}>
              {t("resources.storage.description")}
            </p>
          </div>
        </div>
        <div className={styles.providerBadge}>
          <span>{t("resources.storage.currentBasis")}</span>
          <strong>{currentProviderLabel}</strong>
        </div>
      </header>

      <div className={styles.grid}>
        <section className={styles.usageCard} aria-label={t("resources.storage.usageAria")}>
          <div className={styles.usageHeader}>
            <div>
              <p className={styles.kicker}>GET /api/storage/usage</p>
              <h3 className={styles.cardTitle}>{t("resources.storage.usageTitle")}</h3>
            </div>
            <StatusBadge tone={usageTone}>{safeUsagePercent >= 100 ? t("resources.storage.usageBlocked") : t("resources.storage.usageAvailable")}</StatusBadge>
          </div>
          <ProgressBar label={t("resources.storage.usageBar")} value={safeUsagePercent} />
          <div className={styles.usageMeta}>
            <span>{usageLabel}</span>
            <strong>{limitLabel}</strong>
          </div>
          <p className={styles.helperText}>
            {t("resources.storage.usageHint")}
          </p>
        </section>

        <section className={styles.downloadCard} aria-label={t("resources.storage.downloadAria")}>
          <span className="bubli-icon-tile" aria-hidden="true">
            <ShieldCheck size={18} strokeWidth={2.1} />
          </span>
          <div>
            <p className={styles.kicker}>GET /api/resources/:id/download-url</p>
            <h3 className={styles.cardTitle}>{downloadRuleLabel}</h3>
            <p className={styles.helperText}>
              {t("resources.storage.downloadHint")}
            </p>
          </div>
        </section>
      </div>

      <div className={styles.policyGrid}>
        {policyCards.map((card) => (
          <article className={styles.policyCard} key={card.labelKey}>
            <span className={styles.policyIcon} aria-hidden="true">
              {card.icon}
            </span>
            <div>
              <h3>{t(card.labelKey)}</h3>
              <p>{t(card.descriptionKey)}</p>
            </div>
          </article>
        ))}
      </div>

      <section className={styles.steps} aria-label={t("resources.storage.stepsAria")}>
        {steps.map((step) => {
          const meta = statusMeta[step.status];

          return (
            <article className={styles.step} key={`${step.label}-${step.value}`}>
              <div className={styles.stepHeader}>
                <h3>{step.label}</h3>
                <StatusBadge tone={meta.tone}>{t(meta.labelKey)}</StatusBadge>
              </div>
              <strong>{step.value}</strong>
              <p>{step.description}</p>
            </article>
          );
        })}
      </section>

      {failureReason ? (
        <aside className={styles.notice} aria-label={t("resources.storage.failureAria")}>
          <AlertTriangle size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("resources.storage.failureTitle")}</strong>
            <p>{failureReason}</p>
          </div>
        </aside>
      ) : null}
    </GlassPanel>
  );
}
