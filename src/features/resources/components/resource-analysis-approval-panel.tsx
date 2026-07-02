"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  GitBranch,
  ListChecks,
  PencilLine,
  Sparkles,
} from "lucide-react";
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

import styles from "./resource-analysis-approval-panel.module.css";

type AgentJobStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
type SuggestionType = "PROJECT_INFO" | "CHECK_ITEM" | "WBS" | "TODO" | "SCHEDULE";
type ReviewState = "PENDING" | "APPROVED" | "EDIT_NEEDED" | "HELD";

type AnalysisSuggestion = {
  detailKey: MessageKey;
  evidenceLabelKey: MessageKey;
  reviewState: ReviewState;
  titleKey: MessageKey;
  type: SuggestionType;
};

type AnalysisStep = {
  descriptionKey: MessageKey;
  labelKey: MessageKey;
  tone: StatusTone;
};

export type ResourceAnalysisApprovalPanelProps = HTMLAttributes<HTMLElement> & {
  confidence: number;
  jobStatus: AgentJobStatus;
  projectRoomName: string;
  resourceName: string;
  steps: AnalysisStep[];
  suggestions: AnalysisSuggestion[];
  title?: string;
};

const jobStatusMeta: Record<AgentJobStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  FAILED: { labelKey: "resources.analysis.job.FAILED", tone: "warning" },
  PENDING: { labelKey: "resources.analysis.job.PENDING", tone: "pending" },
  RUNNING: { labelKey: "resources.analysis.job.RUNNING", tone: "agent" },
  SUCCEEDED: { labelKey: "resources.analysis.job.SUCCEEDED", tone: "approved" },
};

const suggestionTypeMeta: Record<SuggestionType, { labelKey: MessageKey; tone: StatusTone }> = {
  CHECK_ITEM: { labelKey: "resources.analysis.type.CHECK_ITEM", tone: "warning" },
  PROJECT_INFO: { labelKey: "resources.analysis.type.PROJECT_INFO", tone: "room" },
  SCHEDULE: { labelKey: "resources.analysis.type.SCHEDULE", tone: "timer" },
  TODO: { labelKey: "resources.analysis.type.TODO", tone: "todo" },
  WBS: { labelKey: "resources.analysis.type.WBS", tone: "agent" },
};

const reviewMeta: Record<ReviewState, { actionLabelKey: MessageKey; labelKey: MessageKey; tone: StatusTone }> = {
  APPROVED: { actionLabelKey: "resources.analysis.review.APPROVED.action", labelKey: "resources.analysis.review.APPROVED.label", tone: "approved" },
  EDIT_NEEDED: { actionLabelKey: "resources.analysis.review.EDIT_NEEDED.action", labelKey: "resources.analysis.review.EDIT_NEEDED.label", tone: "warning" },
  HELD: { actionLabelKey: "resources.analysis.review.HELD.action", labelKey: "resources.analysis.review.HELD.label", tone: "pending" },
  PENDING: { actionLabelKey: "resources.analysis.review.PENDING.action", labelKey: "resources.analysis.review.PENDING.label", tone: "personal" },
};

export const defaultAnalysisSuggestions: AnalysisSuggestion[] = [
  {
    detailKey: "resources.analysis.suggestionDeliveryDetail",
    evidenceLabelKey: "resources.analysis.suggestionDeliveryEvidence",
    reviewState: "PENDING",
    titleKey: "resources.analysis.suggestionDeliveryTitle",
    type: "SCHEDULE",
  },
  {
    detailKey: "resources.analysis.suggestionScopeDetail",
    evidenceLabelKey: "resources.analysis.suggestionScopeEvidence",
    reviewState: "EDIT_NEEDED",
    titleKey: "resources.analysis.suggestionScopeTitle",
    type: "CHECK_ITEM",
  },
  {
    detailKey: "resources.analysis.suggestionWbsDetail",
    evidenceLabelKey: "resources.analysis.suggestionWbsEvidence",
    reviewState: "PENDING",
    titleKey: "resources.analysis.suggestionWbsTitle",
    type: "WBS",
  },
  {
    detailKey: "resources.analysis.suggestionTodoDetail",
    evidenceLabelKey: "resources.analysis.suggestionTodoEvidence",
    reviewState: "APPROVED",
    titleKey: "resources.analysis.suggestionTodoTitle",
    type: "TODO",
  },
];

export const defaultAnalysisSteps: AnalysisStep[] = [
  {
    descriptionKey: "resources.analysis.stepGenDesc",
    labelKey: "resources.analysis.stepGenLabel",
    tone: "agent",
  },
  {
    descriptionKey: "resources.analysis.stepReviewDesc",
    labelKey: "resources.analysis.stepReviewLabel",
    tone: "personal",
  },
  {
    descriptionKey: "resources.analysis.stepApplyDesc",
    labelKey: "resources.analysis.stepApplyLabel",
    tone: "approved",
  },
];

export function ResourceAnalysisApprovalPanel({
  className,
  confidence,
  jobStatus,
  projectRoomName,
  resourceName,
  steps,
  suggestions,
  title,
  ...props
}: ResourceAnalysisApprovalPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("resources.analysis.defaultTitle");
  const jobStatusView = jobStatusMeta[jobStatus];
  const pendingCount = suggestions.filter((suggestion) => suggestion.reviewState === "PENDING").length;
  const approvedCount = suggestions.filter((suggestion) => suggestion.reviewState === "APPROVED").length;
  const reviewNeededCount = suggestions.filter((suggestion) => suggestion.reviewState === "EDIT_NEEDED").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileSearch size={16} strokeWidth={2.1} />}>{t("resources.analysis.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("resources.analysis.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{projectRoomName}</span>
          <strong>{resourceName}</strong>
          <StatusBadge tone={jobStatusView.tone}>{t(jobStatusView.labelKey)}</StatusBadge>
        </div>
      </header>

      <section className={styles.pipelineCard} aria-label={t("resources.analysis.pipelineAria")}>
        <div className={styles.pipelineNode}>
          <span className={styles.iconTile}>
            <FileSearch size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("resources.analysis.pipelineAnalysisTitle")}</strong>
            <p>{t("resources.analysis.pipelineAnalysisDesc")}</p>
          </div>
        </div>
        <ArrowRight size={20} strokeWidth={2.1} aria-hidden="true" />
        <div className={styles.pipelineNode}>
          <span className={styles.iconTile}>
            <Sparkles size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("resources.analysis.pipelineAgentTitle")}</strong>
            <p>{t("resources.analysis.pipelineAgentDesc")}</p>
          </div>
        </div>
        <ArrowRight size={20} strokeWidth={2.1} aria-hidden="true" />
        <div className={styles.pipelineNode}>
          <span className={styles.iconTile}>
            <ListChecks size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>{t("resources.analysis.pipelineApproveTitle")}</strong>
            <p>{t("resources.analysis.pipelineApproveDesc")}</p>
          </div>
        </div>
      </section>

      <section className={styles.metrics} aria-label={t("resources.analysis.metricsAria")}>
        <article>
          <span>{t("resources.analysis.metricConfidence")}</span>
          <strong>{confidence}%</strong>
          <ProgressBar label={t("resources.analysis.metricConfidence")} value={confidence} />
        </article>
        <article>
          <span>{t("resources.analysis.metricPending")}</span>
          <strong>{pendingCount}</strong>
          <StatusBadge tone="personal">{t("resources.analysis.metricPendingBadge")}</StatusBadge>
        </article>
        <article>
          <span>{t("resources.analysis.metricReview")}</span>
          <strong>{reviewNeededCount}</strong>
          <StatusBadge tone="warning">{t("resources.analysis.metricReviewBadge")}</StatusBadge>
        </article>
        <article>
          <span>{t("resources.analysis.metricApproved")}</span>
          <strong>{approvedCount}</strong>
          <StatusBadge tone="approved">{t("resources.analysis.metricApprovedBadge")}</StatusBadge>
        </article>
      </section>

      <section className={styles.suggestionList} aria-label={t("resources.analysis.suggestionAria")}>
        {suggestions.map((suggestion) => {
          const type = suggestionTypeMeta[suggestion.type];
          const review = reviewMeta[suggestion.reviewState];

          return (
            <article className={styles.suggestionCard} key={`${suggestion.type}-${suggestion.titleKey}`}>
              <div className={styles.suggestionTop}>
                <span className={styles.iconTile}>
                  {suggestion.type === "CHECK_ITEM" ? (
                    <AlertCircle size={18} strokeWidth={2.1} aria-hidden="true" />
                  ) : (
                    <GitBranch size={18} strokeWidth={2.1} aria-hidden="true" />
                  )}
                </span>
                <div className={styles.suggestionTitle}>
                  <strong>{t(suggestion.titleKey)}</strong>
                  <span>{t(suggestion.evidenceLabelKey)}</span>
                </div>
                <StatusBadge tone={type.tone}>{t(type.labelKey)}</StatusBadge>
              </div>

              <p className={styles.suggestionDetail}>{t(suggestion.detailKey)}</p>

              <footer className={styles.suggestionFooter}>
                <StatusBadge tone={review.tone}>{t(review.labelKey)}</StatusBadge>
                <div className={styles.actions}>
                  <Button icon={<PencilLine size={15} strokeWidth={2.1} />} size="sm" variant="ghost">
                    {t("resources.analysis.editAction")}
                  </Button>
                  <Button
                    disabled={suggestion.reviewState === "APPROVED"}
                    icon={<CheckCircle2 size={15} strokeWidth={2.1} />}
                    size="sm"
                    variant={suggestion.reviewState === "PENDING" ? "secondary" : "quiet"}
                  >
                    {t(review.actionLabelKey)}
                  </Button>
                </div>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.stepGrid} aria-label={t("resources.analysis.stepAria")}>
        {steps.map((step) => (
          <article key={step.labelKey}>
            <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <StatusBadge tone={step.tone}>{t(step.labelKey)}</StatusBadge>
              <p>{t(step.descriptionKey)}</p>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
