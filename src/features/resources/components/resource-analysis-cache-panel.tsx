"use client";

import { BrainCircuit, Database, FileSearch, Gauge, RefreshCcw, ShieldCheck } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./resource-analysis-cache-panel.module.css";

type AnalysisCacheStatus = "hit" | "miss" | "expired" | "failed";

type AnalysisCacheEntry = {
  description: string;
  fileName: string;
  hashLabel: string;
  status: AnalysisCacheStatus;
  updatedAtLabel: string;
};

type AnalysisCacheMetric = {
  description: string;
  icon: "hash" | "cache" | "job" | "result";
  label: string;
  value: string;
};

export type ResourceAnalysisCachePanelProps = HTMLAttributes<HTMLElement> & {
  entries: AnalysisCacheEntry[];
  metrics: AnalysisCacheMetric[];
  title?: string;
};

const statusMeta: Record<AnalysisCacheStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  hit: { labelKey: "resources.analysis.cacheStatusHit", tone: "success" },
  miss: { labelKey: "resources.analysis.cacheStatusMiss", tone: "pending" },
  expired: { labelKey: "resources.analysis.cacheStatusExpired", tone: "warning" },
  failed: { labelKey: "resources.analysis.cacheStatusFailed", tone: "warning" },
};

const metricIcon: Record<AnalysisCacheMetric["icon"], ReactNode> = {
  hash: <ShieldCheck size={18} strokeWidth={2.1} />,
  cache: <Gauge size={18} strokeWidth={2.1} />,
  job: <BrainCircuit size={18} strokeWidth={2.1} />,
  result: <Database size={18} strokeWidth={2.1} />,
};

export function ResourceAnalysisCachePanel({
  className,
  entries,
  metrics,
  title,
  ...props
}: ResourceAnalysisCachePanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("resources.analysis.cacheTitle");
  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileSearch size={14} strokeWidth={2.1} />}>{t("resources.analysis.cacheChip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("resources.analysis.cacheDescription")}</p>
          </div>
        </div>
        <div className={styles.contractCard}>
          <span>{t("resources.analysis.cacheCostLabel")}</span>
          <strong>NFR-11</strong>
        </div>
      </header>

      <section className={styles.metricGrid} aria-label={t("resources.analysis.cacheMetricAria")}>
        {metrics.map((metric) => (
          <article className={styles.metricCard} key={metric.label}>
            <span className={styles.metricIcon} aria-hidden="true">
              {metricIcon[metric.icon]}
            </span>
            <div>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <span>{metric.description}</span>
            </div>
          </article>
        ))}
      </section>

      <div className={styles.flow} aria-label={t("resources.analysis.cacheFlowAria")}>
        <article>
          <span aria-hidden="true">
            <ShieldCheck size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>{t("resources.analysis.cacheFlowFingerprintTitle")}</h3>
            <p>{t("resources.analysis.cacheFlowFingerprintDesc")}</p>
          </div>
        </article>
        <article>
          <span aria-hidden="true">
            <Gauge size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>{t("resources.analysis.cacheFlowCacheTitle")}</h3>
            <p>{t("resources.analysis.cacheFlowCacheDesc")}</p>
          </div>
        </article>
        <article>
          <span aria-hidden="true">
            <BrainCircuit size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>{t("resources.analysis.cacheFlowJobTitle")}</h3>
            <p>{t("resources.analysis.cacheFlowJobDesc")}</p>
          </div>
        </article>
        <article>
          <span aria-hidden="true">
            <Database size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>{t("resources.analysis.cacheFlowResultTitle")}</h3>
            <p>{t("resources.analysis.cacheFlowResultDesc")}</p>
          </div>
        </article>
      </div>

      <section className={styles.entryList} aria-label={t("resources.analysis.cacheEntryAria")}>
        {entries.map((entry) => {
          const meta = statusMeta[entry.status];

          return (
            <article className={styles.entryItem} key={`${entry.fileName}-${entry.hashLabel}`}>
              <div className={styles.entryMain}>
                <span className={styles.fileIcon} aria-hidden="true">
                  <FileSearch size={18} strokeWidth={2.1} />
                </span>
                <div>
                  <h3>{entry.fileName}</h3>
                  <p>{entry.description}</p>
                  <span>{entry.hashLabel} · {entry.updatedAtLabel}</span>
                </div>
              </div>
              <div className={styles.entrySide}>
                <StatusBadge tone={meta.tone}>{t(meta.labelKey)}</StatusBadge>
                {entry.status === "failed" || entry.status === "expired" ? (
                  <button className={styles.retryButton} type="button">
                    <RefreshCcw size={15} strokeWidth={2.1} />
                    {t("resources.analysis.cacheRetry")}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </GlassPanel>
  );
}
