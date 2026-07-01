import {
  Bot,
  CheckCircle2,
  CircleDashed,
  Database,
  FileText,
  FolderLock,
  Link2,
  RefreshCw,
  RotateCcw,
  ScissorsLineDashed,
  ShieldCheck,
  UploadCloud,
  UsersRound,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./resource-processing-status-panel.module.css";

export type ResourceVisibility = "PERSONAL" | "ROOM_SHARED";
export type ResourceStatus = "UPLOADING" | "READY" | "ANALYZING" | "ANALYZED" | "FAILED";
export type ProcessingStepStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
export type ProcessingStepKind = "UPLOAD" | "TEXT_EXTRACTION" | "CHUNKING" | "EMBEDDING" | "ANALYSIS" | "RELATION";

export type ProcessingStep = {
  detailLabel?: string;
  kind: ProcessingStepKind;
  label: string;
  progress?: number;
  status: ProcessingStepStatus;
  supportingText: string;
};

export type ResourceProcessingStatusPanelProps = {
  className?: string;
  onOpenAnalysis?: () => void;
  onOpenResource?: () => void;
  onRetryFailedStep?: () => void;
  resourceTitle?: string;
  status?: ResourceStatus;
  steps?: ProcessingStep[];
  visibility?: ResourceVisibility;
};

const statusCopy: Record<ResourceStatus, string> = {
  ANALYZED: "분석 완료",
  ANALYZING: "분석 중",
  FAILED: "처리 실패",
  READY: "업로드 완료",
  UPLOADING: "업로드 중",
};

const statusTone: Record<ResourceStatus, StatusTone> = {
  ANALYZED: "approved",
  ANALYZING: "agent",
  FAILED: "warning",
  READY: "success",
  UPLOADING: "pending",
};

const stepStatusCopy: Record<ProcessingStepStatus, string> = {
  FAILED: "확인 필요",
  PENDING: "대기",
  RUNNING: "진행 중",
  SKIPPED: "건너뜀",
  SUCCEEDED: "완료",
};

const stepStatusTone: Record<ProcessingStepStatus, StatusTone> = {
  FAILED: "warning",
  PENDING: "pending",
  RUNNING: "agent",
  SKIPPED: "neutral",
  SUCCEEDED: "approved",
};

const stepIconMap: Record<ProcessingStepKind, typeof UploadCloud> = {
  ANALYSIS: Bot,
  CHUNKING: ScissorsLineDashed,
  EMBEDDING: Database,
  RELATION: Link2,
  TEXT_EXTRACTION: FileText,
  UPLOAD: UploadCloud,
};

const defaultSteps: ProcessingStep[] = [
  {
    detailLabel: "서버 저장",
    kind: "UPLOAD",
    label: "자료 업로드",
    progress: 100,
    status: "SUCCEEDED",
    supportingText: "원본 파일은 서버 저장소에 두고 접근 권한은 서버 기준으로 확인합니다.",
  },
  {
    detailLabel: "PDF 텍스트",
    kind: "TEXT_EXTRACTION",
    label: "텍스트 추출",
    progress: 100,
    status: "SUCCEEDED",
    supportingText: "문서에서 분석에 필요한 텍스트를 뽑아 이후 단계에 넘깁니다.",
  },
  {
    detailLabel: "문서 조각",
    kind: "CHUNKING",
    label: "문서 분할",
    progress: 100,
    status: "SUCCEEDED",
    supportingText: "긴 자료를 검색과 근거 표시가 가능한 단위로 나눕니다.",
  },
  {
    detailLabel: "pgvector",
    kind: "EMBEDDING",
    label: "의미 검색 준비",
    progress: 74,
    status: "RUNNING",
    supportingText: "관련 문서를 찾을 수 있도록 문서 조각의 의미값을 저장합니다.",
  },
  {
    detailLabel: "후보 생성",
    kind: "ANALYSIS",
    label: "자료 분석",
    progress: 0,
    status: "PENDING",
    supportingText: "작업 범위, 납품물, 확인 필요 항목, WBS/TODO 후보를 생성합니다.",
  },
  {
    detailLabel: "관련 문서",
    kind: "RELATION",
    label: "관련 자료 연결",
    progress: 0,
    status: "PENDING",
    supportingText: "같은 권한 범위 안에서 현재 자료와 이어지는 문서를 찾습니다.",
  },
];

function getStepProgress(step: ProcessingStep) {
  if (typeof step.progress === "number") {
    return step.progress;
  }

  if (step.status === "SUCCEEDED") {
    return 100;
  }

  if (step.status === "RUNNING") {
    return 50;
  }

  return 0;
}

function getOverallProgress(steps: ProcessingStep[]) {
  if (steps.length === 0) {
    return 0;
  }

  const total = steps.reduce((sum, step) => sum + getStepProgress(step), 0);

  return Math.round(total / steps.length);
}

export function ResourceProcessingStatusPanel({
  className,
  onOpenAnalysis,
  onOpenResource,
  onRetryFailedStep,
  resourceTitle = "업무범위정리_v2.pdf",
  status = "ANALYZING",
  steps = defaultSteps,
  visibility = "ROOM_SHARED",
}: ResourceProcessingStatusPanelProps) {
  const overallProgress = getOverallProgress(steps);
  const failedStep = steps.find((step) => step.status === "FAILED");
  const runningStep = steps.find((step) => step.status === "RUNNING");
  const VisibilityIcon = visibility === "ROOM_SHARED" ? UsersRound : FolderLock;

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<UploadCloud size={14} />}>자료 처리 상태</Chip>
          <h2>업로드한 자료가 업무 후보가 되기까지의 흐름을 보여줍니다</h2>
          <p>
            원본 저장, 텍스트 추출, 의미 검색 준비, 에이전트 후보 생성을 나눠 표시합니다. 사용자가
            확인한 후보만 작업과 일정에 반영됩니다.
          </p>
        </div>
        <div className={styles.headerActions}>
          {failedStep ? (
            <Button icon={<RotateCcw size={15} />} onClick={onRetryFailedStep} size="sm" variant="quiet">
              실패 단계 재시도
            </Button>
          ) : null}
          <Button icon={<FileText size={15} />} onClick={onOpenResource} size="sm" variant="ghost">
            자료 열기
          </Button>
        </div>
      </header>

      <section className={styles.resourceCard} aria-label="처리 중인 자료">
        <span className={styles.resourceIcon} aria-hidden="true">
          <VisibilityIcon size={20} strokeWidth={2.1} />
        </span>
        <div className={styles.resourceText}>
          <span>{visibility === "ROOM_SHARED" ? "프로젝트룸 자료" : "개인 자료"}</span>
          <strong>{resourceTitle}</strong>
        </div>
        <StatusBadge tone={statusTone[status]}>{statusCopy[status]}</StatusBadge>
      </section>

      <section className={styles.progressSummary} aria-label="전체 처리 진행률">
        <div>
          <strong>{overallProgress}%</strong>
          <span>{runningStep ? `${runningStep.label} 단계 진행 중` : "처리 흐름 대기"}</span>
        </div>
        <ProgressBar label="자료 처리 전체 진행률" value={overallProgress} />
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.stepList} aria-label="자료 처리 단계">
          {steps.map((step) => {
            const StepIcon = stepIconMap[step.kind];
            const isRunning = step.status === "RUNNING";
            const isFailed = step.status === "FAILED";

            return (
              <article className={cn(styles.stepCard, isRunning && styles.stepCardRunning, isFailed && styles.stepCardFailed)} key={step.kind}>
                <span className={styles.stepIcon} aria-hidden="true">
                  <StepIcon size={18} strokeWidth={2.1} />
                </span>
                <div className={styles.stepBody}>
                  <div className={styles.stepTop}>
                    <div>
                      <span>{step.detailLabel}</span>
                      <h3>{step.label}</h3>
                    </div>
                    <StatusBadge tone={stepStatusTone[step.status]}>{stepStatusCopy[step.status]}</StatusBadge>
                  </div>
                  <p>{step.supportingText}</p>
                  <ProgressBar label={`${step.label} 진행률`} value={getStepProgress(step)} />
                </div>
              </article>
            );
          })}
        </section>

        <aside className={styles.policyPanel} aria-label="자료 처리 기준">
          <div className={styles.policyHeader}>
            <span className={styles.policyIcon} aria-hidden="true">
              <ShieldCheck size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>원본과 후보를 분리합니다</h3>
              <p>분석 결과는 바로 확정하지 않고 검토 가능한 후보로 둡니다.</p>
            </div>
          </div>

          <ul className={styles.policyList}>
            <li>
              <CheckCircle2 size={17} strokeWidth={2.1} />
              <div>
                <strong>서버 기록 기준</strong>
                <p>자료 파일과 분석 상태는 서버 기록을 기준으로 복구할 수 있게 둡니다.</p>
              </div>
            </li>
            <li>
              <CircleDashed size={17} strokeWidth={2.1} />
              <div>
                <strong>후보 생성까지만</strong>
                <p>에이전트는 WBS/TODO 후보를 만들고, 확정 반영은 사용자가 승인한 뒤 진행합니다.</p>
              </div>
            </li>
            <li>
              <XCircle size={17} strokeWidth={2.1} />
              <div>
                <strong>실패 단계 표시</strong>
                <p>추출이나 분석이 실패하면 어느 단계에서 멈췄는지 보여주고 재시도할 수 있게 합니다.</p>
              </div>
            </li>
          </ul>

          <div className={styles.storageFlow}>
            <span>원본 저장</span>
            <RefreshCw size={15} />
            <span>분석 후보</span>
            <RefreshCw size={15} />
            <span>사용자 확인</span>
          </div>

          <Button icon={<Bot size={15} />} onClick={onOpenAnalysis} size="sm" variant="quiet">
            분석 후보 보기
          </Button>
        </aside>
      </div>
    </GlassPanel>
  );
}
