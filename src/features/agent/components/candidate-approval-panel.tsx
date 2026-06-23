import {
  ArrowRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  CirclePause,
  ClipboardCheck,
  GitBranch,
  ListChecks,
  PencilLine,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type CandidateType = "wbs" | "todo" | "schedule" | "question";
type CandidateStatus = "pending" | "edited" | "held";

type Candidate = {
  assignee: string;
  confidence: number;
  description: string;
  dueLabel: string;
  source: string;
  status: CandidateStatus;
  title: string;
  type: CandidateType;
};

const candidates: Candidate[] = [
  {
    assignee: "나",
    confidence: 91,
    description: "번역 범위를 1차 번역, 용어 검수, 최종 납품 단계로 나눈 WBS 후보입니다.",
    dueLabel: "D-5",
    source: "계약서 · 요구사항 문서",
    status: "pending",
    title: "번역 작업 WBS 구조",
    type: "wbs",
  },
  {
    assignee: "나",
    confidence: 87,
    description: "납품일 차이를 확인한 뒤 클라이언트에게 보낼 질문으로 남길 수 있습니다.",
    dueLabel: "오늘",
    source: "계약서 · 회의록",
    status: "edited",
    title: "납품일 기준 확인 질문",
    type: "question",
  },
  {
    assignee: "김정현",
    confidence: 78,
    description: "용어집 초안을 검토하고 수정 요청 여부를 정리하는 TODO 후보입니다.",
    dueLabel: "6.27",
    source: "요구사항 문서",
    status: "held",
    title: "용어집 초안 검토",
    type: "todo",
  },
];

const typeMeta: Record<CandidateType, { icon: typeof GitBranch; label: string; tone: "agent" | "todo" | "timer" | "warning" }> = {
  question: { icon: ShieldCheck, label: "확인 질문", tone: "warning" },
  schedule: { icon: CalendarClock, label: "일정 후보", tone: "timer" },
  todo: { icon: ListChecks, label: "TODO 후보", tone: "todo" },
  wbs: { icon: GitBranch, label: "WBS 후보", tone: "agent" },
};

const statusMeta: Record<CandidateStatus, { label: string; tone: "pending" | "warning" | "neutral" }> = {
  edited: { label: "수정됨", tone: "warning" },
  held: { label: "보류", tone: "neutral" },
  pending: { label: "승인 전", tone: "pending" },
};

function CandidateCard({ candidate }: { candidate: Candidate }) {
  const type = typeMeta[candidate.type];
  const status = statusMeta[candidate.status];
  const Icon = type.icon;

  return (
    <article className="candidate-approval-card">
      <div className="candidate-approval-card__top">
        <span className="bubli-icon-tile" aria-hidden="true">
          <Icon size={16} strokeWidth={2.1} />
        </span>
        <div>
          <div className="candidate-approval-card__meta">
            <StatusBadge tone={type.tone}>{type.label}</StatusBadge>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          </div>
          <h3>{candidate.title}</h3>
          <p>{candidate.source}</p>
        </div>
      </div>
      <p>{candidate.description}</p>
      <div className="candidate-approval-card__chips">
        <Chip>{candidate.assignee}</Chip>
        <Chip>{candidate.dueLabel}</Chip>
        <Chip>신뢰도 {candidate.confidence}%</Chip>
      </div>
      <ProgressBar label={`${candidate.title} 후보 신뢰도`} value={candidate.confidence} />
      <footer>
        <Button icon={<CheckCircle2 size={15} />} size="sm" variant="primary">
          승인
        </Button>
        <Button icon={<PencilLine size={15} />} size="sm" variant="quiet">
          수정
        </Button>
        <Button icon={<CirclePause size={15} />} size="sm" variant="ghost">
          보류
        </Button>
      </footer>
    </article>
  );
}

export function CandidateApprovalPanel() {
  return (
    <section className="candidate-approval" aria-label="에이전트 후보 승인 패널">
      <GlassPanel className="candidate-approval__hero">
        <div>
          <Chip icon={<Bot size={14} />} selected>
            후보 승인
          </Chip>
          <h2>에이전트가 만든 후보는 사용자가 확인한 뒤 작업으로 반영합니다</h2>
          <p>
            WBS, TODO, 일정, 확인 질문은 승인 전까지 후보 상태로 남습니다. 승인한 항목만 API 서버를 거쳐
            확정 데이터로 저장됩니다.
          </p>
        </div>
        <div className="candidate-approval__summary">
          <StatusBadge tone="agent">agent_suggestions</StatusBadge>
          <strong>12개</strong>
          <span>검토할 후보</span>
          <ProgressBar label="후보 검토 진행률" value={64} />
        </div>
      </GlassPanel>

      <div className="candidate-approval__flow">
        <span>agent_jobs 완료</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>후보 목록</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>사용자 확인</span>
        <ArrowRight size={16} strokeWidth={2.1} />
        <span>WBS/TODO/일정 반영</span>
      </div>

      <div className="candidate-approval__grid">
        <GlassPanel className="candidate-approval__list">
          <div className="candidate-approval__section-title">
            <h3>검토 대기 후보</h3>
            <p>같은 자료에서 나온 후보를 한 번에 보되, 확정은 항목별로 처리합니다.</p>
          </div>
          <div className="candidate-approval__items">
            {candidates.map((candidate) => (
              <CandidateCard candidate={candidate} key={candidate.title} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="candidate-approval__rules">
          <h3>반영 기준</h3>
          <div>
            <ClipboardCheck size={17} strokeWidth={2.1} />
            <p>승인한 WBS 후보만 WBS/작업판에 들어갑니다.</p>
          </div>
          <div>
            <ListChecks size={17} strokeWidth={2.1} />
            <p>담당자가 있는 TODO는 개인 대시보드와 TODO 버블에도 보입니다.</p>
          </div>
          <div>
            <CalendarClock size={17} strokeWidth={2.1} />
            <p>날짜가 확인된 항목만 일정과 일정/WBS 버블에 연결합니다.</p>
          </div>
          <div>
            <ShieldCheck size={17} strokeWidth={2.1} />
            <p>에이전트는 후보를 만들고, 확정 저장은 사용자 확인 후 처리합니다.</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
