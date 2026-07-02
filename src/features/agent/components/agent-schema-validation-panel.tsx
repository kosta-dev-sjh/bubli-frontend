"use client";

import { BrainCircuit, CheckCircle2, FileCheck2, ShieldCheck, TriangleAlert } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./agent-schema-validation-panel.module.css";

type SchemaValidationStatus = "passed" | "needsReview" | "failed" | "pending";

type SchemaValidationResult = {
  description: string;
  field: string;
  status: SchemaValidationStatus;
  value: string;
};

type SchemaValidationMetric = {
  description: string;
  icon: "schema" | "prompt" | "model" | "job";
  label: string;
  value: string;
};

export type AgentSchemaValidationPanelProps = HTMLAttributes<HTMLElement> & {
  metrics: SchemaValidationMetric[];
  title?: string;
  validationResults: SchemaValidationResult[];
};

const statusMeta: Record<SchemaValidationStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  passed: { labelKey: "agent.schema.statusPassed", tone: "success" },
  needsReview: { labelKey: "agent.schema.statusNeedsReview", tone: "warning" },
  failed: { labelKey: "agent.schema.statusFailed", tone: "warning" },
  pending: { labelKey: "agent.schema.statusPending", tone: "pending" },
};

const metricIcon: Record<SchemaValidationMetric["icon"], ReactNode> = {
  schema: <FileCheck2 size={18} strokeWidth={2.1} />,
  prompt: <BrainCircuit size={18} strokeWidth={2.1} />,
  model: <BrainCircuit size={18} strokeWidth={2.1} />,
  job: <ShieldCheck size={18} strokeWidth={2.1} />,
};

export function AgentSchemaValidationPanel({
  className,
  metrics,
  title,
  validationResults,
  ...props
}: AgentSchemaValidationPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("agent.schema.defaultTitle");
  const failedCount = validationResults.filter((result) => result.status === "failed").length;
  const reviewCount = validationResults.filter((result) => result.status === "needsReview").length;
  const hasIssue = failedCount + reviewCount > 0;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileCheck2 size={14} strokeWidth={2.1} />}>{t("agent.schema.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("agent.schema.desc")}</p>
          </div>
        </div>
        <div className={styles.resultCard}>
          <span>{t("agent.schema.validationStatus")}</span>
          <strong>{hasIssue ? t("agent.schema.issueCount", { count: failedCount + reviewCount }) : t("agent.schema.passed")}</strong>
        </div>
      </header>

      <section className={styles.metricGrid} aria-label={t("agent.schema.metricAria")}>
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

      <div className={styles.flow} aria-label={t("agent.schema.flowAria")}>
        <article>
          <span aria-hidden="true">
            <BrainCircuit size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>{t("agent.schema.flowCandidateTitle")}</h3>
            <p>{t("agent.schema.flowCandidateDesc")}</p>
          </div>
        </article>
        <article>
          <span aria-hidden="true">
            <FileCheck2 size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>{t("agent.schema.flowCheckTitle")}</h3>
            <p>{t("agent.schema.flowCheckDesc")}</p>
          </div>
        </article>
        <article>
          <span aria-hidden="true">
            <CheckCircle2 size={18} strokeWidth={2.1} />
          </span>
          <div>
            <h3>{t("agent.schema.flowSaveTitle")}</h3>
            <p>{t("agent.schema.flowSaveDesc")}</p>
          </div>
        </article>
      </div>

      <section className={styles.resultList} aria-label={t("agent.schema.resultListAria")}>
        {validationResults.map((result) => {
          const meta = statusMeta[result.status];

          return (
            <article className={styles.resultItem} key={`${result.field}-${result.value}`}>
              <div className={styles.resultMain}>
                <span className={styles.fieldIcon} aria-hidden="true">
                  {result.status === "failed" ? <TriangleAlert size={18} strokeWidth={2.1} /> : <FileCheck2 size={18} strokeWidth={2.1} />}
                </span>
                <div>
                  <h3>{result.field}</h3>
                  <p>{result.description}</p>
                  <span>{result.value}</span>
                </div>
              </div>
              <StatusBadge tone={meta.tone}>{t(meta.labelKey)}</StatusBadge>
            </article>
          );
        })}
      </section>
    </GlassPanel>
  );
}
