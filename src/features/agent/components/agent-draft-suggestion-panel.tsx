import { CheckCircle2, FileQuestion, Mail, MessageSquareQuote, PencilLine, Send, Sparkles, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type DraftSuggestion = {
  title: string;
  type: "question" | "client" | "requirement";
  source: string;
  summary: string;
  confidence: number;
};

const suggestions: DraftSuggestion[] = [
  {
    confidence: 88,
    source: "업무 문서, 회의록",
    summary: "수정 2회가 문서 전체 기준인지, 페이지별 기준인지 확인이 필요합니다.",
    title: "수정 범위 확인 질문",
    type: "question",
  },
  {
    confidence: 82,
    source: "요구사항 문서",
    summary: "납품 파일 형식과 검수 담당자를 클라이언트에게 묻는 문장입니다.",
    title: "클라이언트 질문 초안",
    type: "client",
  },
  {
    confidence: 76,
    source: "회의록",
    summary: "확정된 화면 범위와 아직 확인되지 않은 범위를 나눠 정리합니다.",
    title: "요구사항 정리 초안",
    type: "requirement",
  },
];

const typeMeta: Record<DraftSuggestion["type"], { label: string; tone: "agent" | "pending" | "room" }> = {
  client: { label: "보낼 문장 후보", tone: "room" },
  question: { label: "확인 질문 후보", tone: "pending" },
  requirement: { label: "정리 초안", tone: "agent" },
};

function DraftSuggestionRow({ item }: { item: DraftSuggestion }) {
  const type = typeMeta[item.type];

  return (
    <article className="agent-draft-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileQuestion size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="agent-draft-row__meta">
          <StatusBadge tone={type.tone}>{type.label}</StatusBadge>
          <span>{item.source}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        <ProgressBar label={`${item.title} 신뢰도`} value={item.confidence} />
      </div>
    </article>
  );
}

export function AgentDraftSuggestionPanel() {
  return (
    <section className="agent-draft" aria-label="에이전트 초안 제안">
      <GlassPanel className="agent-draft__hero">
        <div>
          <Chip icon={<WandSparkles size={14} />} selected>
            초안 제안
          </Chip>
          <h2>에이전트는 바로 보내는 답이 아니라, 사용자가 검토할 초안을 만듭니다</h2>
          <p>
            업무 문서, 요구사항, 회의록을 읽고 확인 질문 후보와 클라이언트에게 보낼 질문 초안을 만듭니다. 모든
            초안은 사용자가 검토한 뒤 복사하거나 작업에 반영합니다.
          </p>
        </div>
        <div className="agent-draft__summary">
          <StatusBadge tone="agent">후보 생성</StatusBadge>
          <strong>6</strong>
          <span>검토할 초안</span>
          <ProgressBar label="초안 검토 진행률" value={58} />
        </div>
      </GlassPanel>

      <div className="agent-draft__grid">
        <GlassPanel className="agent-draft__preview">
          <div className="agent-draft__preview-top">
            <span className="bubli-icon-tile" aria-hidden="true">
              <Sparkles size={17} strokeWidth={2.1} />
            </span>
            <div>
              <h3>질문 초안 미리보기</h3>
              <p>클라이언트에게 보내기 전 문장을 사용자가 직접 고칩니다.</p>
            </div>
          </div>

          <div className="agent-draft__message">
            <StatusBadge tone="room">보낼 문장 후보</StatusBadge>
            <h3>검수 기준과 납품 파일 형식을 한 번 더 확인하고 싶습니다.</h3>
            <p>
              업무 문서에는 최종 PDF 납품으로 적혀 있고, 회의록에는 원본 파일 전달도 언급되어 있어 어느 형식을
              기준으로 검수할지 확인 부탁드립니다.
            </p>
          </div>

          <div className="agent-draft__actions">
            <Button icon={<PencilLine size={15} />} variant="primary">
              문장 수정
            </Button>
            <Button icon={<Send size={15} />} variant="quiet">
              복사
            </Button>
          </div>
        </GlassPanel>

        <GlassPanel className="agent-draft__list">
          <div className="agent-draft__list-top">
            <div>
              <h3>제안된 초안</h3>
              <p>에이전트 결과는 확정 데이터가 아니라 검토할 후보로 표시합니다.</p>
            </div>
            <Chip>사용자 검토</Chip>
          </div>
          <div className="agent-draft__items">
            {suggestions.map((item) => (
              <DraftSuggestionRow item={item} key={`${item.type}-${item.title}`} />
            ))}
          </div>
        </GlassPanel>
      </div>

      <div className="agent-draft__policy">
        <GlassPanel>
          <MessageSquareQuote size={18} strokeWidth={2.1} />
          <h3>확인 질문 후보</h3>
          <p>빠진 값이나 서로 다른 표현을 사용자가 다시 물어볼 수 있게 정리합니다.</p>
        </GlassPanel>
        <GlassPanel>
          <Mail size={18} strokeWidth={2.1} />
          <h3>클라이언트 문장 초안</h3>
          <p>바로 전송하지 않고, 사용자가 고치거나 복사할 수 있는 문장으로 제공합니다.</p>
        </GlassPanel>
        <GlassPanel>
          <CheckCircle2 size={18} strokeWidth={2.1} />
          <h3>승인 후 반영</h3>
          <p>WBS/TODO나 일정 반영은 사용자가 승인한 항목만 처리합니다.</p>
        </GlassPanel>
      </div>
    </section>
  );
}
