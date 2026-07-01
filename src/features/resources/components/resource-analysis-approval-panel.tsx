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
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./resource-analysis-approval-panel.module.css";

type AgentJobStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
type SuggestionType = "PROJECT_INFO" | "CHECK_ITEM" | "WBS" | "TODO" | "SCHEDULE";
type ReviewState = "PENDING" | "APPROVED" | "EDIT_NEEDED" | "HELD";

type AnalysisSuggestion = {
  detail: string;
  evidenceLabel: string;
  reviewState: ReviewState;
  title: string;
  type: SuggestionType;
};

type AnalysisStep = {
  description: string;
  label: string;
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
    detail: "납품일 후보를 7월 15일로 읽었습니다. 일정에 넣기 전 원문 날짜와 한 번 더 맞춥니다.",
    evidenceLabel: "계약서 2쪽",
    reviewState: "PENDING",
    title: "납품일 후보",
    type: "SCHEDULE",
  },
  {
    detail: "수정 횟수와 검수 기준이 문서마다 다르게 적혀 있어 클라이언트 확인 질문으로 묶습니다.",
    evidenceLabel: "계약서 · 회의록",
    reviewState: "EDIT_NEEDED",
    title: "수정 범위 확인",
    type: "CHECK_ITEM",
  },
  {
    detail: "번역 초안, 1차 검토, 최종 반영을 하위 작업으로 나눌 수 있습니다.",
    evidenceLabel: "요구사항 문서",
    reviewState: "PENDING",
    title: "WBS 후보",
    type: "WBS",
  },
  {
    detail: "1차 번역본 검토 요청을 내 TODO로 추가할 수 있습니다.",
    evidenceLabel: "회의록 6월 18일",
    reviewState: "APPROVED",
    title: "내 TODO 후보",
    type: "TODO",
  },
];

export const defaultAnalysisSteps: AnalysisStep[] = [
  {
    description: "자료를 올리면 에이전트가 프로젝트 정보, 확인 필요 항목, WBS/TODO 후보를 구조화합니다.",
    label: "후보 생성",
    tone: "agent",
  },
  {
    description: "후보는 확정 데이터가 아니며 사용자가 승인, 수정, 보류 중 하나를 고릅니다.",
    label: "사용자 검토",
    tone: "personal",
  },
  {
    description: "승인된 항목만 API/core 모듈을 거쳐 WBS, TODO, 일정에 반영됩니다.",
    label: "승인 후 반영",
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
            <article className={styles.suggestionCard} key={`${suggestion.type}-${suggestion.title}`}>
              <div className={styles.suggestionTop}>
                <span className={styles.iconTile}>
                  {suggestion.type === "CHECK_ITEM" ? (
                    <AlertCircle size={18} strokeWidth={2.1} aria-hidden="true" />
                  ) : (
                    <GitBranch size={18} strokeWidth={2.1} aria-hidden="true" />
                  )}
                </span>
                <div className={styles.suggestionTitle}>
                  <strong>{suggestion.title}</strong>
                  <span>{suggestion.evidenceLabel}</span>
                </div>
                <StatusBadge tone={type.tone}>{t(type.labelKey)}</StatusBadge>
              </div>

              <p className={styles.suggestionDetail}>{suggestion.detail}</p>

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
          <article key={step.label}>
            <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <StatusBadge tone={step.tone}>{step.label}</StatusBadge>
              <p>{step.description}</p>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
