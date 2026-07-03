"use client";

import { AlertTriangle, BellRing, CheckCircle2, Clock3, FileCheck2, ListRestart, RefreshCcw, Route, ShieldCheck, XCircle } from "lucide-react";
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

import styles from "./agent-job-retry-policy-panel.module.css";

type JobStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";
type RetryDecision = "RETRY_ALLOWED" | "WAITING" | "BLOCKED";

type AgentJob = {
  failureReason?: string;
  jobType: string;
  lastEventLabel: string;
  retryCount: number;
  retryDecision: RetryDecision;
  reviewRuleLabel: string;
  structureLabel: string;
  strategyLabel: string;
  status: JobStatus;
  title: string;
};

type RetryPolicy = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type AgentJobRetryPolicyPanelProps = HTMLAttributes<HTMLElement> & {
  jobs: AgentJob[];
  maxRetryCount?: number;
  policies: RetryPolicy[];
  title?: string;
};

const statusMeta: Record<JobStatus, { labelKey: MessageKey; tone: StatusTone; icon: typeof Clock3 }> = {
  CANCELED: { icon: XCircle, labelKey: "agent.retry.statusCanceled", tone: "personal" },
  FAILED: { icon: AlertTriangle, labelKey: "agent.retry.statusFailed", tone: "warning" },
  PENDING: { icon: Clock3, labelKey: "agent.retry.statusPending", tone: "pending" },
  RUNNING: { icon: RefreshCcw, labelKey: "agent.retry.statusRunning", tone: "todo" },
  SUCCEEDED: { icon: CheckCircle2, labelKey: "agent.retry.statusSucceeded", tone: "approved" },
};

const retryMeta: Record<RetryDecision, { labelKey: MessageKey; tone: StatusTone }> = {
  BLOCKED: { labelKey: "agent.retry.decisionBlocked", tone: "warning" },
  RETRY_ALLOWED: { labelKey: "agent.retry.decisionAllowed", tone: "approved" },
  WAITING: { labelKey: "agent.retry.decisionWaiting", tone: "pending" },
};

// 라벨 텍스트는 t() 키로 저장하고 렌더 시 번역한다. 호출부가 문자열을 넘기면 t()가 그대로 반환한다.
export const defaultAgentRetryJobs: AgentJob[] = [
  {
    failureReason: "agent.retry.job1FailureReason",
    jobType: "agent.retry.job1JobType",
    lastEventLabel: "agent.retry.job1LastEvent",
    retryCount: 1,
    retryDecision: "RETRY_ALLOWED",
    reviewRuleLabel: "agent.retry.job1ReviewRule",
    structureLabel: "agent.retry.job1Structure",
    strategyLabel: "agent.retry.job1Strategy",
    status: "FAILED",
    title: "agent.retry.job1Title",
  },
  {
    jobType: "agent.retry.job2JobType",
    lastEventLabel: "agent.retry.job2LastEvent",
    retryCount: 0,
    retryDecision: "WAITING",
    reviewRuleLabel: "agent.retry.job2ReviewRule",
    structureLabel: "agent.retry.job2Structure",
    strategyLabel: "agent.retry.job2Strategy",
    status: "RUNNING",
    title: "agent.retry.job2Title",
  },
  {
    jobType: "agent.retry.job3JobType",
    lastEventLabel: "agent.retry.job3LastEvent",
    retryCount: 0,
    retryDecision: "BLOCKED",
    reviewRuleLabel: "agent.retry.job3ReviewRule",
    structureLabel: "agent.retry.job3Structure",
    strategyLabel: "agent.retry.job3Strategy",
    status: "SUCCEEDED",
    title: "agent.retry.job3Title",
  },
];

// label/description 필드는 t() 키를 담는다(렌더 시 번역, 호출부 문자열은 그대로 통과).
export const defaultRetryPolicies: RetryPolicy[] = [
  {
    description: "agent.retry.policyRetryDesc",
    label: "agent.retry.policyRetryLabel",
    tone: "pending",
  },
  {
    description: "agent.retry.policySchemaDesc",
    label: "agent.retry.policySchemaLabel",
    tone: "agent",
  },
  {
    description: "agent.retry.policyBoundaryDesc",
    label: "agent.retry.policyBoundaryLabel",
    tone: "approved",
  },
];

export function AgentJobRetryPolicyPanel({
  className,
  jobs,
  maxRetryCount = 3,
  policies,
  title,
  ...props
}: AgentJobRetryPolicyPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("agent.retry.defaultTitle");
  const failedCount = jobs.filter((job) => job.status === "FAILED").length;
  const retryableCount = jobs.filter((job) => job.retryDecision === "RETRY_ALLOWED").length;
  const retryPercent = Math.round((retryableCount / Math.max(jobs.length, 1)) * 100);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<ListRestart size={16} strokeWidth={2.1} />}>{t("agent.retry.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("agent.retry.desc")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{t("agent.retry.retryable")}</span>
          <strong>{t("agent.retry.countItems", { count: retryableCount })}</strong>
          <StatusBadge tone={failedCount > 0 ? "warning" : "success"}>{t("agent.retry.failedCount", { count: failedCount })}</StatusBadge>
        </div>
      </header>

      <section className={styles.retryOverview} aria-label={t("agent.retry.overviewAria")}>
        <article className={styles.retryCard}>
          <div className={styles.retryTop}>
            <span className={styles.iconTile}>
              <RefreshCcw size={18} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <div>
              <strong>{retryPercent}%</strong>
              <p>{t("agent.retry.retryRatioDesc")}</p>
            </div>
            <StatusBadge tone="pending">{t("agent.retry.maxRetry", { count: maxRetryCount })}</StatusBadge>
          </div>
          <ProgressBar value={retryPercent} />
        </article>
        <article className={styles.eventCard}>
          <BellRing size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("agent.retry.completeEvent")}</strong>
            <p>{t("agent.retry.completeEventDesc")}</p>
          </div>
        </article>
      </section>

      <section className={styles.jobList} aria-label={t("agent.retry.jobListAria")}>
        {jobs.map((job) => {
          const status = statusMeta[job.status];
          const retry = retryMeta[job.retryDecision];
          const StatusIcon = status.icon;

          return (
            <article className={cn(styles.jobItem, job.status === "FAILED" && styles.failedJob)} key={`${job.title}-${job.jobType}`}>
              <div className={styles.jobHeader}>
                <span className={styles.iconTile}>
                  <StatusIcon size={18} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <div className={styles.jobTitle}>
                  <strong>{t(job.title as MessageKey)}</strong>
                  <span>
                    {t("agent.retry.jobRetryMeta", { count: job.retryCount, jobType: t(job.jobType as MessageKey), max: maxRetryCount })}
                  </span>
                </div>
                <div className={styles.badges}>
                  <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
                  <StatusBadge tone={retry.tone}>{t(retry.labelKey)}</StatusBadge>
                </div>
              </div>

              <div className={styles.metaGrid}>
                <div>
                  <span>{t("agent.retry.reviewRule")}</span>
                  <b>{t(job.reviewRuleLabel as MessageKey)}</b>
                </div>
                <div>
                  <span>{t("agent.retry.structure")}</span>
                  <b>{t(job.structureLabel as MessageKey)}</b>
                </div>
                <div>
                  <span>{t("agent.retry.strategy")}</span>
                  <b>{t(job.strategyLabel as MessageKey)}</b>
                </div>
              </div>

              <footer className={styles.jobFooter}>
                <span>
                  <FileCheck2 size={15} strokeWidth={2.1} aria-hidden="true" />
                  {t((job.failureReason ?? job.lastEventLabel) as MessageKey)}
                </span>
                <Button icon={<RefreshCcw size={14} strokeWidth={2.1} />} size="sm" variant="quiet">
                  {t("agent.retry.retryConfirm")}
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.policyGrid} aria-label={t("agent.retry.policyAria")}>
        {policies.map((policy) => (
          <article key={policy.label}>
            {policy.label === "agent.retry.policySchemaLabel" ? (
              <FileCheck2 size={17} strokeWidth={2.1} aria-hidden="true" />
            ) : policy.label === "agent.retry.policyBoundaryLabel" ? (
              <ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />
            ) : (
              <Route size={17} strokeWidth={2.1} aria-hidden="true" />
            )}
            <div>
              <strong>{t(policy.label as MessageKey)}</strong>
              <p>{t(policy.description as MessageKey)}</p>
              <StatusBadge tone={policy.tone}>{t("agent.retry.criterion")}</StatusBadge>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
