import { Bot, CheckCircle2, CircleAlert, Clock4, FileSearch, ListChecks, RotateCcw, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AgentJobStatus, AgentJobTargetType } from "@/types/api/agent";

type AgentJob = {
  errorCode?: string;
  events: string[];
  idempotencyKey: string;
  jobId: string;
  progress: number;
  resourceName: string;
  retryable?: boolean;
  roomName: string;
  status: AgentJobStatus;
  submittedAt: string;
  targetId: string;
  targetType: AgentJobTargetType;
  type: string;
};

const jobs: AgentJob[] = [
  {
    events: ["문서 종류 분류", "납품물 후보 추출", "확인 질문 후보 생성"],
    idempotencyKey: "agent-job-resource-20260622-001",
    jobId: "job-20260622-001",
    progress: 74,
    resourceName: "번역계약서_v2.pdf",
    roomName: "번역 계약서 정리",
    status: "RUNNING",
    submittedAt: "방금 전",
    targetId: "resource-001",
    targetType: "RESOURCE",
    type: "문서 분석",
  },
  {
    events: ["WBS 후보 저장", "TODO 후보 저장", "프로젝트룸 이벤트 발행"],
    idempotencyKey: "agent-job-room-20260622-000",
    jobId: "job-20260622-000",
    progress: 100,
    resourceName: "회의록_0618.md",
    roomName: "웹사이트 리뉴얼",
    status: "SUCCEEDED",
    submittedAt: "18분 전",
    targetId: "room-014",
    targetType: "PROJECT_ROOM",
    type: "WBS/TODO 후보",
  },
  {
    errorCode: "RESOURCE_PARSE_FAILED",
    events: ["파일 읽기 실패", "재시도 대기"],
    idempotencyKey: "agent-job-resource-20260621-014",
    jobId: "job-20260621-014",
    progress: 24,
    resourceName: "요구사항_초안.docx",
    retryable: true,
    roomName: "브랜드 소개서",
    status: "FAILED",
    submittedAt: "어제",
    targetId: "resource-118",
    targetType: "RESOURCE",
    type: "요구사항 정리",
  },
];

const statusMeta: Record<AgentJobStatus, { icon: typeof Clock4; label: string; tone: "pending" | "agent" | "success" | "warning" | "neutral" }> = {
  CANCELED: { icon: XCircle, label: "취소됨", tone: "neutral" },
  FAILED: { icon: CircleAlert, label: "실패", tone: "warning" },
  PENDING: { icon: Clock4, label: "대기", tone: "pending" },
  RUNNING: { icon: Bot, label: "실행 중", tone: "agent" },
  SUCCEEDED: { icon: CheckCircle2, label: "완료", tone: "success" },
};

function AgentJobRow({ job }: { job: AgentJob }) {
  const meta = statusMeta[job.status];
  const Icon = meta.icon;

  return (
    <article className="agent-job-row">
      <div className="agent-job-row__head">
        <span className="bubli-icon-tile" aria-hidden="true">
          <Icon size={17} strokeWidth={2.1} />
        </span>
        <div>
          <div className="agent-job-row__meta">
            <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
            <span>{job.type}</span>
            <span>{job.submittedAt}</span>
          </div>
          <h3>{job.resourceName}</h3>
          <p>{job.roomName}</p>
        </div>
        <code>{job.jobId}</code>
      </div>
      <ProgressBar label="처리 진행률" value={job.progress} />
      <div className="agent-job-row__contract">
        <span>targetType: {job.targetType}</span>
        <span>targetId: {job.targetId}</span>
        <span>idempotencyKey: {job.idempotencyKey}</span>
      </div>
      {job.errorCode ? (
        <div className="agent-job-row__failure">
          <span>{job.errorCode}</span>
          <b>{job.retryable ? "재시도 가능" : "재시도 불가"}</b>
        </div>
      ) : null}
      <ul className="agent-job-row__events">
        {job.events.map((event) => (
          <li key={event}>{event}</li>
        ))}
      </ul>
    </article>
  );
}

export function AgentJobStatusPanel() {
  return (
    <section className="agent-job-status" aria-label="에이전트 작업 상태">
      <GlassPanel className="agent-job-status__hero">
        <div className="agent-job-status__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <FileSearch size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>에이전트 작업</Chip>
            <h2>문서 분석은 agent_jobs로 요청하고 상태를 확인합니다</h2>
            <p>
              생성 요청은 idempotencyKey로 중복을 막고, 상태 변화는 AGENT_JOB_STATUS_CHANGED 이벤트로 받습니다.
            </p>
          </div>
        </div>
        <div className="agent-job-status__summary">
          <strong>3</strong>
          <span>최근 작업</span>
          <p>완료 이벤트는 프로젝트룸 이벤트와 개인 알림으로 이어집니다.</p>
        </div>
      </GlassPanel>

      <div className="agent-job-status__grid">
        <GlassPanel className="agent-job-status__list">
          <div className="agent-job-status__toolbar">
            <h3>분석 작업</h3>
            <Button icon={<RotateCcw size={15} />} size="sm" variant="quiet">
              상태 새로고침
            </Button>
          </div>
          <div className="agent-job-status__items">
            {jobs.map((job) => (
              <AgentJobRow job={job} key={job.jobId} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="agent-job-status__policy">
          <h3>처리 경계</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Bot size={16} strokeWidth={2.1} />
            </span>
            <p>에이전트 모듈은 문서 분석, 후보 생성, 구조화, 모델 호출 로그 기록을 맡습니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ListChecks size={16} strokeWidth={2.1} />
            </span>
            <p>에이전트는 후보만 만들고, 승인 후 확정 데이터 생성은 대상 도메인 Service가 처리합니다.</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
