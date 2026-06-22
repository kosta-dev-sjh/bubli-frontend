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

const jobStatusMeta: Record<AgentJobStatus, { label: string; tone: StatusTone }> = {
  FAILED: { label: "분석 실패", tone: "warning" },
  PENDING: { label: "대기", tone: "pending" },
  RUNNING: { label: "분석 중", tone: "agent" },
  SUCCEEDED: { label: "후보 생성", tone: "approved" },
};

const suggestionTypeMeta: Record<SuggestionType, { label: string; tone: StatusTone }> = {
  CHECK_ITEM: { label: "확인 필요", tone: "warning" },
  PROJECT_INFO: { label: "프로젝트 정보", tone: "room" },
  SCHEDULE: { label: "일정", tone: "timer" },
  TODO: { label: "TODO", tone: "todo" },
  WBS: { label: "WBS", tone: "agent" },
};

const reviewMeta: Record<ReviewState, { actionLabel: string; label: string; tone: StatusTone }> = {
  APPROVED: { actionLabel: "반영됨", label: "승인됨", tone: "approved" },
  EDIT_NEEDED: { actionLabel: "수정", label: "수정 필요", tone: "warning" },
  HELD: { actionLabel: "보류", label: "보류", tone: "pending" },
  PENDING: { actionLabel: "승인", label: "검토 대기", tone: "personal" },
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
  title = "자료 분석 후보 검토",
  ...props
}: ResourceAnalysisApprovalPanelProps) {
  const jobStatusView = jobStatusMeta[jobStatus];
  const pendingCount = suggestions.filter((suggestion) => suggestion.reviewState === "PENDING").length;
  const approvedCount = suggestions.filter((suggestion) => suggestion.reviewState === "APPROVED").length;
  const reviewNeededCount = suggestions.filter((suggestion) => suggestion.reviewState === "EDIT_NEEDED").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileSearch size={16} strokeWidth={2.1} />}>resource_analysis</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              업로드한 자료에서 뽑은 값은 바로 업무에 들어가지 않습니다. 사용자가 확인한 후보만 프로젝트룸의 WBS,
              TODO, 일정으로 이어집니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{projectRoomName}</span>
          <strong>{resourceName}</strong>
          <StatusBadge tone={jobStatusView.tone}>{jobStatusView.label}</StatusBadge>
        </div>
      </header>

      <section className={styles.pipelineCard} aria-label="자료 분석 승인 흐름">
        <div className={styles.pipelineNode}>
          <span className={styles.iconTile}>
            <FileSearch size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>자료 분석</strong>
            <p>문서에서 후보 추출</p>
          </div>
        </div>
        <ArrowRight size={20} strokeWidth={2.1} aria-hidden="true" />
        <div className={styles.pipelineNode}>
          <span className={styles.iconTile}>
            <Sparkles size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>agent_suggestions</strong>
            <p>확인할 항목 구성</p>
          </div>
        </div>
        <ArrowRight size={20} strokeWidth={2.1} aria-hidden="true" />
        <div className={styles.pipelineNode}>
          <span className={styles.iconTile}>
            <ListChecks size={18} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <strong>사용자 승인</strong>
            <p>확정 데이터 반영</p>
          </div>
        </div>
      </section>

      <section className={styles.metrics} aria-label="자료 분석 후보 요약">
        <article>
          <span>분석 신뢰도</span>
          <strong>{confidence}%</strong>
          <ProgressBar label="분석 신뢰도" value={confidence} />
        </article>
        <article>
          <span>검토 대기</span>
          <strong>{pendingCount}</strong>
          <StatusBadge tone="personal">후보</StatusBadge>
        </article>
        <article>
          <span>확인 필요</span>
          <strong>{reviewNeededCount}</strong>
          <StatusBadge tone="warning">질문 후보</StatusBadge>
        </article>
        <article>
          <span>승인됨</span>
          <strong>{approvedCount}</strong>
          <StatusBadge tone="approved">반영 대상</StatusBadge>
        </article>
      </section>

      <section className={styles.suggestionList} aria-label="분석 후보 목록">
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
                <StatusBadge tone={type.tone}>{type.label}</StatusBadge>
              </div>

              <p className={styles.suggestionDetail}>{suggestion.detail}</p>

              <footer className={styles.suggestionFooter}>
                <StatusBadge tone={review.tone}>{review.label}</StatusBadge>
                <div className={styles.actions}>
                  <Button icon={<PencilLine size={15} strokeWidth={2.1} />} size="sm" variant="ghost">
                    수정
                  </Button>
                  <Button
                    disabled={suggestion.reviewState === "APPROVED"}
                    icon={<CheckCircle2 size={15} strokeWidth={2.1} />}
                    size="sm"
                    variant={suggestion.reviewState === "PENDING" ? "secondary" : "quiet"}
                  >
                    {review.actionLabel}
                  </Button>
                </div>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.stepGrid} aria-label="후보 승인 기준">
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
