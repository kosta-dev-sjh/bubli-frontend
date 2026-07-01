import { Bot, CheckCircle2, Database, FileText, MessageSquareText, RefreshCw, Server, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type MemoryItem = {
  title: string;
  range: string;
  status: "ready" | "running" | "review";
  detail: string;
};

const memoryItems: MemoryItem[] = [
  {
    detail: "수정 범위 확인, 검수 일정 조율",
    range: "대화 214-248",
    status: "ready",
    title: "결정사항 요약",
  },
  {
    detail: "납품 파일명과 검수 기준이 아직 불명확",
    range: "대화 249-263",
    status: "review",
    title: "남은 질문",
  },
  {
    detail: "작업판에 올릴 후보 4개 생성",
    range: "대화 264-281",
    status: "running",
    title: "TODO 후보",
  },
];

const statusMeta: Record<MemoryItem["status"], { label: string; tone: "success" | "pending" | "agent" }> = {
  ready: { label: "요약됨", tone: "success" },
  review: { label: "확인 필요", tone: "pending" },
  running: { label: "정리 중", tone: "agent" },
};

function MemoryRow({ item }: { item: MemoryItem }) {
  const status = statusMeta[item.status];

  return (
    <article className="room-memory-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileText size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="room-memory-row__meta">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{item.range}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.detail}</p>
      </div>
    </article>
  );
}

export function RoomMemorySummaryPanel() {
  return (
    <section className="room-memory" aria-label="프로젝트룸 대화 기억">
      <GlassPanel className="room-memory__hero">
        <div>
          <Chip icon={<Bot size={14} />} selected>
            프로젝트룸 에이전트
          </Chip>
          <h2>프로젝트룸 대화는 협업 기록으로 남기고, 필요한 범위만 요약합니다</h2>
          <p>
            프로젝트룸 채팅에서 `/bubli 정리`, `/bubli todo`, `/bubli 질문`을 부르면 에이전트가 최근 대화
            범위를 읽고 요약과 후보를 만듭니다. 확정 데이터는 사용자가 승인한 뒤 반영합니다.
          </p>
        </div>
        <div className="room-memory__summary">
          <StatusBadge tone="agent">대화 정리</StatusBadge>
          <strong>68</strong>
          <span>읽은 메시지</span>
          <ProgressBar label="요약 진행률" value={72} />
        </div>
      </GlassPanel>

      <div className="room-memory__grid">
        <GlassPanel className="room-memory__command">
          <div className="room-memory__command-top">
            <span className="bubli-icon-tile" aria-hidden="true">
              <Sparkles size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h3>채팅에서 부르는 명령어</h3>
              <p>결과는 채팅 메시지로 남고, 장기 보관이 필요한 내용만 따로 요약합니다.</p>
            </div>
          </div>

          <div className="room-memory__chat">
            <span>담당자</span>
            <p>/bubli 정리 오늘 회의에서 결정된 것만 정리해줘</p>
          </div>
          <div className="room-memory__agent">
            <StatusBadge tone="agent">에이전트 응답</StatusBadge>
            <h3>결정사항 3개와 확인 질문 2개를 찾았어요.</h3>
            <p>WBS/TODO 후보로 만들 항목은 사용자가 검토한 뒤 작업판에 반영합니다.</p>
          </div>

          <div className="room-memory__actions">
            <Button icon={<CheckCircle2 size={15} />} variant="primary">
              후보 검토
            </Button>
            <Button icon={<RefreshCw size={15} />} variant="quiet">
              다시 정리
            </Button>
          </div>
        </GlassPanel>

        <GlassPanel className="room-memory__list">
          <div className="room-memory__list-top">
            <div>
              <h3>장기 요약</h3>
              <p>어떤 대화 범위를 요약했는지 남겨 나중에 다시 확인할 수 있게 합니다.</p>
            </div>
            <Chip>범위 기록</Chip>
          </div>
          <div className="room-memory__items">
            {memoryItems.map((item) => (
              <MemoryRow item={item} key={`${item.range}-${item.title}`} />
            ))}
          </div>
        </GlassPanel>
      </div>

      <div className="room-memory__policy">
        <GlassPanel>
          <Server size={18} strokeWidth={2.1} />
          <h3>채팅 원본</h3>
          <p>프로젝트룸 채팅과 1:1 채팅은 협업 기록이므로 서버 기록을 기준으로 봅니다.</p>
        </GlassPanel>
        <GlassPanel>
          <MessageSquareText size={18} strokeWidth={2.1} />
          <h3>앱 빠른 표시</h3>
          <p>앱은 최근 메시지를 먼저 보여주고, 빠진 메시지는 서버에서 보충합니다.</p>
        </GlassPanel>
        <GlassPanel>
          <Database size={18} strokeWidth={2.1} />
          <h3>요약 보관</h3>
          <p>결정사항, 남은 질문, 후보와 요약 범위만 장기 요약으로 남깁니다.</p>
        </GlassPanel>
      </div>
    </section>
  );
}
