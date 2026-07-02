"use client";

import {
  AlertCircle,
  Bot,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  CirclePause,
  FileQuestion,
  GitBranch,
  Inbox,
  ListTodo,
  PencilLine,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

export type AgentSuggestionInboxState = "ready" | "empty" | "loading" | "error";
export type AgentSuggestionKind = "REQUIREMENT" | "WBS" | "TODO" | "QUESTION" | "SCHEDULE";
export type AgentInboxSuggestionStatus = "DRAFT" | "EDITED" | "HELD" | "APPROVED";

export type AgentSuggestionInboxItem = {
  confidence: number;
  description: string;
  dueLabel?: string;
  id: string;
  kind: AgentSuggestionKind;
  projectRoomName: string;
  sourceLabel: string;
  status: AgentInboxSuggestionStatus;
  title: string;
};

export type AgentSuggestionInboxPanelProps = HTMLAttributes<HTMLElement> & {
  items?: AgentSuggestionInboxItem[];
  state?: AgentSuggestionInboxState;
};

const defaultItems: AgentSuggestionInboxItem[] = [
  {
    confidence: 92,
    description: "요구사항 문서의 화면 범위를 WBS 상위 작업으로 묶을 수 있습니다.",
    dueLabel: "이번 주",
    id: "suggestion-wbs-scope",
    kind: "WBS",
    projectRoomName: "브랜드 상세페이지 번역",
    sourceLabel: "요구사항정의서_v1.3.pdf",
    status: "DRAFT",
    title: "번역 검수 WBS 구조",
  },
  {
    confidence: 87,
    description: "업무 문서와 회의록의 납품일이 달라 클라이언트에게 확인할 질문입니다.",
    dueLabel: "오늘",
    id: "suggestion-question-due-date",
    kind: "QUESTION",
    projectRoomName: "업무 기준 문서 정리",
    sourceLabel: "업무 문서 · 회의록",
    status: "EDITED",
    title: "납품일 기준 확인 질문",
  },
  {
    confidence: 83,
    description: "검수 기준표를 먼저 만들면 이후 TODO와 일정으로 연결하기 쉽습니다.",
    dueLabel: "D-2",
    id: "suggestion-todo-review-table",
    kind: "TODO",
    projectRoomName: "웹사이트 리뉴얼",
    sourceLabel: "회의록_0618.md",
    status: "HELD",
    title: "검수 기준표 초안 작성",
  },
];

const kindMeta: Record<AgentSuggestionKind, { icon: typeof Bot; label: string; tone: StatusTone }> = {
  QUESTION: { icon: FileQuestion, label: "확인 질문", tone: "warning" },
  REQUIREMENT: { icon: Bot, label: "요구사항", tone: "agent" },
  SCHEDULE: { icon: CalendarClock, label: "일정 후보", tone: "timer" },
  TODO: { icon: ListTodo, label: "TODO 후보", tone: "todo" },
  WBS: { icon: GitBranch, label: "WBS 후보", tone: "agent" },
};

const statusMeta: Record<AgentInboxSuggestionStatus, { label: string; tone: StatusTone }> = {
  APPROVED: { label: "승인됨", tone: "approved" },
  DRAFT: { label: "검토 전", tone: "pending" },
  EDITED: { label: "수정됨", tone: "warning" },
  HELD: { label: "보류", tone: "neutral" },
};

function SuggestionInboxStatePanel({ state }: { state: Exclude<AgentSuggestionInboxState, "ready"> }) {
  const stateCopy = {
    empty: {
      action: "자료 분석 시작",
      description: "아직 검토할 후보가 없습니다. 자료를 올리거나 프로젝트룸 채팅에서 에이전트를 불러 후보를 만들 수 있습니다.",
      icon: Inbox,
      title: "검토할 제안이 없습니다",
    },
    error: {
      action: "다시 불러오기",
      description: "에이전트 제안을 불러오지 못했습니다. 잠시 뒤 다시 확인하세요.",
      icon: AlertCircle,
      title: "제안함을 불러오지 못했습니다",
    },
    loading: {
      action: "불러오는 중",
      description: "프로젝트룸별 후보와 승인 대기 항목을 모으고 있습니다.",
      icon: CircleDashed,
      title: "제안함을 정리하고 있습니다",
    },
  } satisfies Record<Exclude<AgentSuggestionInboxState, "ready">, {
    action: string;
    description: string;
    icon: typeof Inbox;
    title: string;
  }>;

  const copy = stateCopy[state];
  const Icon = copy.icon;

  return (
    <GlassPanel className="agent-suggestion-inbox-state">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={20} strokeWidth={2.1} />
      </span>
      <div>
        <Chip selected={state === "loading"}>{state === "loading" ? "로딩" : state === "error" ? "에러" : "빈 화면"}</Chip>
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>
      <Button disabled={state === "loading"} icon={<RefreshCcw size={15} strokeWidth={2.1} />} variant={state === "error" ? "primary" : "quiet"}>
        {copy.action}
      </Button>
    </GlassPanel>
  );
}

function SuggestionRow({ item }: { item: AgentSuggestionInboxItem }) {
  const kind = kindMeta[item.kind];
  const status = statusMeta[item.status];
  const Icon = kind.icon;

  return (
    <article className="agent-suggestion-inbox-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <Icon size={17} strokeWidth={2.1} />
      </span>
      <div className="agent-suggestion-inbox-row__body">
        <div className="agent-suggestion-inbox-row__top">
          <div>
            <div className="agent-suggestion-inbox-row__badges">
              <StatusBadge tone={kind.tone}>{kind.label}</StatusBadge>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </div>
            <h3>{item.title}</h3>
          </div>
          <Chip>{item.confidence}%</Chip>
        </div>
        <p>{item.description}</p>
        <div className="agent-suggestion-inbox-row__meta">
          <span>{item.projectRoomName}</span>
          <span>{item.sourceLabel}</span>
          <span>{item.dueLabel ?? "마감 없음"}</span>
        </div>
        <ProgressBar label={`${item.title} 신뢰도`} value={item.confidence} />
        <footer className="agent-suggestion-inbox-row__actions">
          <Button icon={<CheckCircle2 size={15} strokeWidth={2.1} />} size="sm" variant="primary">
            승인
          </Button>
          <Button icon={<PencilLine size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
            수정
          </Button>
          <Button icon={<CirclePause size={15} strokeWidth={2.1} />} size="sm" variant="ghost">
            보류
          </Button>
          <Button icon={<Trash2 size={15} strokeWidth={2.1} />} size="sm" variant="ghost">
            삭제
          </Button>
        </footer>
      </div>
    </article>
  );
}

export function AgentSuggestionInboxPanel({
  className,
  items = defaultItems,
  state = "ready",
  ...props
}: AgentSuggestionInboxPanelProps) {
  const pendingCount = items.filter((item) => item.status === "DRAFT" || item.status === "EDITED").length;
  const approvedCount = items.filter((item) => item.status === "APPROVED").length;

  return (
    <section className={cn("agent-suggestion-inbox", className)} aria-label="에이전트 제안함" {...props}>
      {state === "ready" ? (
        <>
          <GlassPanel className="agent-suggestion-inbox__hero">
            <div>
              <Chip icon={<Inbox size={15} strokeWidth={2.1} />} selected>
                에이전트 제안함
              </Chip>
              <h2>후보를 확정하기 전 한곳에서 검토합니다</h2>
              <p>
                요구사항, WBS, TODO, 확인 질문, 일정 후보를 모아 보고 승인한 항목만 실제 작업으로 넘깁니다.
              </p>
            </div>
            <div className="agent-suggestion-inbox__summary">
              <strong>{items.length}</strong>
              <span>전체 후보</span>
              <p>승인 대기 {pendingCount}개 · 승인됨 {approvedCount}개</p>
            </div>
          </GlassPanel>

          <GlassPanel className="agent-suggestion-inbox__list">
            {items.map((item) => (
              <SuggestionRow item={item} key={item.id} />
            ))}
          </GlassPanel>
        </>
      ) : (
        <SuggestionInboxStatePanel state={state} />
      )}
    </section>
  );
}
