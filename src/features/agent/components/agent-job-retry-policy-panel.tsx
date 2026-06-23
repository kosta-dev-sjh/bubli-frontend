import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  FileJson2,
  ListRestart,
  RefreshCcw,
  Route,
  ShieldCheck,
  XCircle,
} from "lucide-react";
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
  modelName: string;
  promptVersion: string;
  retryCount: number;
  retryDecision: RetryDecision;
  schemaVersion: string;
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
  BLOCKED: { label: "재시도 제한", tone: "warning" },
  RETRY_ALLOWED: { label: "재시도 가능", tone: "approved" },
  WAITING: { label: "대기 후 재시도", tone: "pending" },
};

export const defaultAgentRetryJobs: AgentJob[] = [
  {
    failureReason: "응답 구조가 schema_version 2026-06-19와 맞지 않습니다.",
    jobType: "문서 분석",
    lastEventLabel: "JSON 구조 검증 실패",
    modelName: "gpt-4.1-mini",
    promptVersion: "resource-analysis-v3",
    retryCount: 1,
    retryDecision: "RETRY_ALLOWED",
    schemaVersion: "resource-analysis-2026-06-19",
    status: "FAILED",
    title: "요구사항 문서 후보 생성",
  },
  {
    jobType: "WBS 후보 생성",
    lastEventLabel: "에이전트 모듈 실행 중",
    modelName: "gpt-4.1-mini",
    promptVersion: "wbs-draft-v2",
    retryCount: 0,
    retryDecision: "WAITING",
    schemaVersion: "wbs-task-2026-06-19",
    status: "RUNNING",
    title: "번역 프로젝트 WBS 초안",
  },
  {
    jobType: "질문 초안",
    lastEventLabel: "후보 저장 완료",
    modelName: "gpt-4.1-mini",
    promptVersion: "clarification-v1",
    retryCount: 0,
    retryDecision: "BLOCKED",
    schemaVersion: "clarification-question-2026-06-19",
    status: "SUCCEEDED",
    title: "납품일 확인 질문",
  },
];

export const defaultRetryPolicies: RetryPolicy[] = [
  {
    description: "실패한 작업은 원인과 재시도 횟수를 확인한 뒤 같은 API 계약으로 다시 요청합니다.",
    label: "상태 전이",
    tone: "pending",
  },
  {
    description: "Structured Output 검증을 통과한 후보만 검토 화면에 노출합니다.",
    label: "스키마 검증",
    tone: "agent",
  },
  {
    description: "에이전트는 후보를 만들고, 확정 데이터 반영은 사용자 승인 후 API 서버가 처리합니다.",
    label: "확정 분리",
    tone: "approved",
  },
];

export function AgentJobRetryPolicyPanel({
  className,
  jobs,
  maxRetryCount = 3,
  policies,
  title = "에이전트 작업 재시도",
  ...props
}: AgentJobRetryPolicyPanelProps) {
  const failedCount = jobs.filter((job) => job.status === "FAILED").length;
  const retryableCount = jobs.filter((job) => job.retryDecision === "RETRY_ALLOWED").length;
  const retryPercent = Math.round((retryableCount / Math.max(jobs.length, 1)) * 100);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<ListRestart size={16} strokeWidth={2.1} />}>agent_jobs</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              에이전트 실행은 job으로 관리하고, 실패하면 원인과 재시도 가능 여부를 분리해 보여줍니다. 완료 결과는
              WebSocket 이벤트나 알림으로 이어지고, 사용자가 확인한 후보만 반영합니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>재시도 가능</span>
          <strong>{retryableCount}개</strong>
          <StatusBadge tone={failedCount > 0 ? "warning" : "success"}>실패 {failedCount}개</StatusBadge>
        </div>
      </header>

      <section className={styles.retryOverview} aria-label="재시도 상태 요약">
        <article className={styles.retryCard}>
          <div className={styles.retryTop}>
            <span className={styles.iconTile}>
              <RefreshCcw size={18} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <div>
              <strong>{retryPercent}%</strong>
              <p>재시도 가능한 작업 비율</p>
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

      <section className={styles.jobList} aria-label="에이전트 작업 목록">
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
                    {job.jobType} · 재시도 {job.retryCount}/{maxRetryCount}
                  </span>
                </div>
                <div className={styles.badges}>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  <StatusBadge tone={retry.tone}>{retry.label}</StatusBadge>
                </div>
              </div>

              <div className={styles.metaGrid}>
                <div>
                  <span>prompt_version</span>
                  <b>{job.promptVersion}</b>
                </div>
                <div>
                  <span>schema_version</span>
                  <b>{job.schemaVersion}</b>
                </div>
                <div>
                  <span>model_name</span>
                  <b>{job.modelName}</b>
                </div>
              </div>

              <footer className={styles.jobFooter}>
                <span>
                  <FileJson2 size={15} strokeWidth={2.1} aria-hidden="true" />
                  {job.failureReason ?? job.lastEventLabel}
                </span>
                <Button icon={<RefreshCcw size={14} strokeWidth={2.1} />} size="sm" variant="quiet">
                  재시도 확인
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.policyGrid} aria-label="에이전트 재시도 기준">
        {policies.map((policy) => (
          <article key={policy.label}>
            {policy.label === "스키마 검증" ? (
              <FileJson2 size={17} strokeWidth={2.1} aria-hidden="true" />
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
