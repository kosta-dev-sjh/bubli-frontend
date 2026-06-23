import {
  AlertTriangle,
  Bell,
  Braces,
  CheckCircle2,
  Clock3,
  FileSearch,
  ListChecks,
  LoaderCircle,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./agent-job-status-panel.module.css";

export type AgentJobStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";
export type AgentSuggestionStatus = "DRAFT" | "APPROVED" | "HELD" | "REJECTED";

export type AgentJobStep = {
  description: string;
  id: string;
  label: string;
  status: AgentJobStatus;
};

export type AgentSuggestionGroup = {
  count: number;
  id: string;
  label: string;
  status: AgentSuggestionStatus;
};

type AgentJobStatusPanelProps = HTMLAttributes<HTMLElement> & {
  eventLabel?: string;
  jobId?: string;
  jobTypeLabel?: string;
  modelLabel?: string;
  onOpenSuggestions?: () => void;
  onRetryJob?: () => void;
  progress?: number;
  schemaLabel?: string;
  startedAtLabel?: string;
  status?: AgentJobStatus;
  steps?: AgentJobStep[];
  suggestionGroups?: AgentSuggestionGroup[];
};

const statusCopy: Record<AgentJobStatus, string> = {
  PENDING: "대기",
  RUNNING: "진행 중",
  SUCCEEDED: "완료",
  FAILED: "실패",
  CANCELED: "취소",
};

const statusTone: Record<AgentJobStatus, "neutral" | "pending" | "success" | "warning"> = {
  PENDING: "neutral",
  RUNNING: "pending",
  SUCCEEDED: "success",
  FAILED: "warning",
  CANCELED: "neutral",
};

const suggestionCopy: Record<AgentSuggestionStatus, string> = {
  DRAFT: "승인 전",
  APPROVED: "승인됨",
  HELD: "보류",
  REJECTED: "삭제됨",
};

const suggestionTone: Record<AgentSuggestionStatus, "pending" | "approved" | "warning" | "neutral"> = {
  DRAFT: "pending",
  APPROVED: "approved",
  HELD: "warning",
  REJECTED: "neutral",
};

const defaultSteps: AgentJobStep[] = [
  {
    description: "API 서버가 로그인, 권한, 분석 제한을 확인한 뒤 작업을 만들었습니다.",
    id: "created",
    label: "agent_jobs 생성",
    status: "SUCCEEDED",
  },
  {
    description: "에이전트 모듈이 자료 요약과 확인 필요 항목을 구조화하고 있습니다.",
    id: "analyzing",
    label: "문서 분석",
    status: "RUNNING",
  },
  {
    description: "WBS, TODO, 확인 질문은 모두 후보로 저장됩니다.",
    id: "suggestions",
    label: "후보 JSON 생성",
    status: "PENDING",
  },
  {
    description: "완료 이벤트는 WebSocket과 알림으로 화면에 전달됩니다.",
    id: "notify",
    label: "완료 알림",
    status: "PENDING",
  },
];

const defaultSuggestionGroups: AgentSuggestionGroup[] = [
  {
    count: 3,
    id: "wbs",
    label: "WBS 후보",
    status: "DRAFT",
  },
  {
    count: 5,
    id: "todo",
    label: "TODO 후보",
    status: "DRAFT",
  },
  {
    count: 2,
    id: "questions",
    label: "확인 질문",
    status: "HELD",
  },
];

function getStatusIcon(status: AgentJobStatus) {
  if (status === "SUCCEEDED") {
    return <CheckCircle2 size={18} />;
  }

  if (status === "FAILED") {
    return <AlertTriangle size={18} />;
  }

  if (status === "CANCELED") {
    return <XCircle size={18} />;
  }

  if (status === "RUNNING") {
    return <LoaderCircle size={18} />;
  }

  return <Clock3 size={18} />;
}

export function AgentJobStatusPanel({
  className,
  eventLabel = "완료 시 WebSocket 이벤트와 알림으로 전달",
  jobId = "job_8f42",
  jobTypeLabel = "자료 분석 · WBS/TODO 후보",
  modelLabel = "model_name 기록 대기",
  onOpenSuggestions,
  onRetryJob,
  progress = 62,
  schemaLabel = "schema v1.0",
  startedAtLabel = "시작 1분 전",
  status = "RUNNING",
  steps = defaultSteps,
  suggestionGroups = defaultSuggestionGroups,
  ...props
}: AgentJobStatusPanelProps) {
  const draftCount = suggestionGroups
    .filter((group) => group.status === "DRAFT" || group.status === "HELD")
    .reduce((sum, group) => sum + group.count, 0);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={cn(styles.statusOrb, styles[`statusOrb${status}`])} aria-hidden="true">
            {getStatusIcon(status)}
          </span>
          <div>
            <StatusBadge tone={statusTone[status]}>{statusCopy[status]}</StatusBadge>
            <h2>에이전트 작업 상태</h2>
            <p>분석 결과는 후보로 저장하고, 사용자가 검토한 뒤 업무 데이터에 반영합니다.</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<ListChecks size={15} />} onClick={onOpenSuggestions} size="sm" variant="primary">
            후보 검토
          </Button>
          <Button icon={<RefreshCcw size={15} />} onClick={onRetryJob} size="sm" variant="quiet">
            다시 시도
          </Button>
        </div>
      </header>

      <div className={styles.jobCard}>
        <div className={styles.jobMeta}>
          <Chip icon={<Sparkles size={14} />}>{jobTypeLabel}</Chip>
          <Chip icon={<Clock3 size={14} />}>{startedAtLabel}</Chip>
          <Chip icon={<Braces size={14} />}>{schemaLabel}</Chip>
        </div>
        <div className={styles.progressRow}>
          <div>
            <strong>{jobId}</strong>
            <span>{modelLabel}</span>
          </div>
          <span>{progress}%</span>
        </div>
        <ProgressBar label="에이전트 작업 진행률" value={progress} />
      </div>

      <div className={styles.grid}>
        <section className={styles.stepPanel} aria-label="에이전트 작업 단계">
          <h3>
            <FileSearch size={17} />
            처리 단계
          </h3>
          <ol className={styles.stepList}>
            {steps.map((step) => (
              <li className={styles.stepItem} key={step.id}>
                <span className={cn(styles.stepIcon, styles[`stepIcon${step.status}`])} aria-hidden="true">
                  {getStatusIcon(step.status)}
                </span>
                <div>
                  <div className={styles.stepHead}>
                    <strong>{step.label}</strong>
                    <StatusBadge tone={statusTone[step.status]}>{statusCopy[step.status]}</StatusBadge>
                  </div>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.suggestionPanel} aria-label="생성된 후보 상태">
          <h3>
            <ListChecks size={17} />
            후보 상태
          </h3>
          <div className={styles.suggestionList}>
            {suggestionGroups.map((group) => (
              <article className={styles.suggestionCard} key={group.id}>
                <div>
                  <strong>{group.label}</strong>
                  <span>{group.count}개</span>
                </div>
                <StatusBadge tone={suggestionTone[group.status]}>{suggestionCopy[group.status]}</StatusBadge>
              </article>
            ))}
          </div>
          <div className={styles.notice}>
            <Bell size={16} />
            <span>{eventLabel}</span>
          </div>
        </section>
      </div>

      <footer className={styles.boundary}>
        <div>
          <ShieldCheck size={18} />
          <strong>확정 반영 기준</strong>
        </div>
        <p>
          에이전트 모듈은 후보 생성과 모델 호출 로그 기록까지만 맡습니다. 승인 전 후보 {draftCount}개는 실제 WBS,
          TODO, 일정에 반영하지 않습니다.
        </p>
      </footer>
    </GlassPanel>
  );
}
