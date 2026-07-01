import { AlertTriangle, BellRing, CheckCircle2, Clock3, FileCheck2, ListRestart, RefreshCcw, Route, ShieldCheck, XCircle } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
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

const statusMeta: Record<JobStatus, { label: string; tone: StatusTone; icon: typeof Clock3 }> = {
  CANCELED: { icon: XCircle, label: "취소됨", tone: "personal" },
  FAILED: { icon: AlertTriangle, label: "실패", tone: "warning" },
  PENDING: { icon: Clock3, label: "대기", tone: "pending" },
  RUNNING: { icon: RefreshCcw, label: "실행 중", tone: "todo" },
  SUCCEEDED: { icon: CheckCircle2, label: "완료", tone: "approved" },
};

const retryMeta: Record<RetryDecision, { label: string; tone: StatusTone }> = {
  BLOCKED: { label: "다시 시도 제한", tone: "warning" },
  RETRY_ALLOWED: { label: "다시 시도 가능", tone: "approved" },
  WAITING: { label: "잠시 뒤 다시 시도", tone: "pending" },
};

export const defaultAgentRetryJobs: AgentJob[] = [
  {
    failureReason: "결과가 정해진 형식과 맞지 않아 다시 확인이 필요합니다.",
    jobType: "문서 분석",
    lastEventLabel: "결과 형식 확인 실패",
    retryCount: 1,
    retryDecision: "RETRY_ALLOWED",
    reviewRuleLabel: "기준/요구사항 확인",
    structureLabel: "자료 분석 후보",
    strategyLabel: "짧은 문서 정리",
    status: "FAILED",
    title: "요구사항 문서 후보 생성",
  },
  {
    jobType: "WBS 후보 생성",
    lastEventLabel: "에이전트 정리 진행 중",
    retryCount: 0,
    retryDecision: "WAITING",
    reviewRuleLabel: "작업 범위 분리",
    structureLabel: "WBS/TODO 후보",
    strategyLabel: "작업 단위 정리",
    status: "RUNNING",
    title: "번역 프로젝트 WBS 초안",
  },
  {
    jobType: "질문 초안",
    lastEventLabel: "후보 저장 완료",
    retryCount: 0,
    retryDecision: "BLOCKED",
    reviewRuleLabel: "확인 질문 우선",
    structureLabel: "질문 후보",
    strategyLabel: "클라이언트 질문 정리",
    status: "SUCCEEDED",
    title: "납품일 확인 질문",
  },
];

export const defaultRetryPolicies: RetryPolicy[] = [
  {
    description: "실패한 정리 작업은 원인과 시도 횟수를 확인한 뒤 같은 조건으로 다시 요청합니다.",
    label: "다시 시도 기준",
    tone: "pending",
  },
  {
    description: "정해진 형식을 통과한 후보만 검토 화면에 보여줍니다.",
    label: "결과 형식 확인",
    tone: "agent",
  },
  {
    description: "에이전트는 후보를 만들고, 확정 데이터 반영은 사용자 승인 후 처리합니다.",
    label: "확정 분리",
    tone: "approved",
  },
];

export function AgentJobRetryPolicyPanel({
  className,
  jobs,
  maxRetryCount = 3,
  policies,
  title = "에이전트 정리 작업 다시 시도",
  ...props
}: AgentJobRetryPolicyPanelProps) {
  const failedCount = jobs.filter((job) => job.status === "FAILED").length;
  const retryableCount = jobs.filter((job) => job.retryDecision === "RETRY_ALLOWED").length;
  const retryPercent = Math.round((retryableCount / Math.max(jobs.length, 1)) * 100);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<ListRestart size={16} strokeWidth={2.1} />}>정리 작업</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              에이전트 정리 작업이 실패하면 원인과 다시 시도 가능 여부를 분리해 보여줍니다. 완료 결과는 화면 알림으로 이어지고,
              사용자가 확인한 후보만 반영합니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>다시 시도 가능</span>
          <strong>{retryableCount}개</strong>
          <StatusBadge tone={failedCount > 0 ? "warning" : "success"}>실패 {failedCount}개</StatusBadge>
        </div>
      </header>

      <section className={styles.retryOverview} aria-label="다시 시도 상태 요약">
        <article className={styles.retryCard}>
          <div className={styles.retryTop}>
            <span className={styles.iconTile}>
              <RefreshCcw size={18} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <div>
              <strong>{retryPercent}%</strong>
              <p>다시 시도할 수 있는 작업 비율</p>
            </div>
            <StatusBadge tone="pending">최대 {maxRetryCount}회</StatusBadge>
          </div>
          <ProgressBar value={retryPercent} />
        </article>
        <article className={styles.eventCard}>
          <BellRing size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>완료 이벤트</strong>
            <p>작업 완료나 실패는 프로젝트룸 이벤트와 개인 알림으로 표시합니다.</p>
          </div>
        </article>
      </section>

      <section className={styles.jobList} aria-label="에이전트 정리 작업 목록">
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
                  <strong>{job.title}</strong>
                  <span>
                    {job.jobType} · 다시 시도 {job.retryCount}/{maxRetryCount}
                  </span>
                </div>
                <div className={styles.badges}>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  <StatusBadge tone={retry.tone}>{retry.label}</StatusBadge>
                </div>
              </div>

              <div className={styles.metaGrid}>
                <div>
                  <span>정리 기준</span>
                  <b>{job.reviewRuleLabel}</b>
                </div>
                <div>
                  <span>후보 구조</span>
                  <b>{job.structureLabel}</b>
                </div>
                <div>
                  <span>정리 방식</span>
                  <b>{job.strategyLabel}</b>
                </div>
              </div>

              <footer className={styles.jobFooter}>
                <span>
                  <FileCheck2 size={15} strokeWidth={2.1} aria-hidden="true" />
                  {job.failureReason ?? job.lastEventLabel}
                </span>
                <Button icon={<RefreshCcw size={14} strokeWidth={2.1} />} size="sm" variant="quiet">
                  다시 시도 확인
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.policyGrid} aria-label="에이전트 다시 시도 기준">
        {policies.map((policy) => (
          <article key={policy.label}>
            {policy.label === "결과 형식 확인" ? (
              <FileCheck2 size={17} strokeWidth={2.1} aria-hidden="true" />
            ) : policy.label === "확정 분리" ? (
              <ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />
            ) : (
              <Route size={17} strokeWidth={2.1} aria-hidden="true" />
            )}
            <div>
              <strong>{policy.label}</strong>
              <p>{policy.description}</p>
              <StatusBadge tone={policy.tone}>기준</StatusBadge>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
