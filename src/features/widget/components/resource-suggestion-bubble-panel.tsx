import { ArrowRight, EyeOff, FileSearch, Pin, ShieldCheck, Sparkles, Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type SuggestedResource = {
  title: string;
  source: string;
  reason: string;
  status: "candidate" | "pinned" | "hidden";
  confidence: number;
};

const resources: SuggestedResource[] = [
  {
    confidence: 86,
    reason: "현재 TODO의 납품 기준과 관련",
    source: "프로젝트룸 자료",
    status: "candidate",
    title: "업무기준문서_최종본_v2.1.pdf",
  },
  {
    confidence: 74,
    reason: "회의록에서 같은 검수 일정 언급",
    source: "프로젝트룸 자료",
    status: "pinned",
    title: "회의록_0618.md",
  },
  {
    confidence: 61,
    reason: "개인 메모와 유사한 확인 질문",
    source: "개인 자료",
    status: "hidden",
    title: "개인 메모_수정 범위.md",
  },
];

const statusMeta: Record<SuggestedResource["status"], { label: string; tone: "agent" | "memo" | "neutral" }> = {
  candidate: { label: "후보", tone: "agent" },
  hidden: { label: "숨김", tone: "neutral" },
  pinned: { label: "고정됨", tone: "memo" },
};

function ResourceSuggestionRow({ item }: { item: SuggestedResource }) {
  const status = statusMeta[item.status];

  return (
    <article className="resource-suggestion-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileSearch size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="resource-suggestion-row__meta">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{item.source}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.reason}</p>
        <ProgressBar label={`${item.title} 관련도`} value={item.confidence} />
      </div>
    </article>
  );
}

export function ResourceSuggestionBubblePanel() {
  return (
    <section className="resource-suggestion" aria-label="자료 제안 버블">
      <GlassPanel className="resource-suggestion__hero">
        <div>
          <Chip icon={<Sparkles size={14} />} selected>
            자료 제안 버블
          </Chip>
          <h2>작업 중 필요한 자료만 후보로 띄우고, 사용자가 처리 상태를 정합니다</h2>
          <p>
            자료 제안 버블은 선택한 프로젝트룸과 현재 작업 맥락을 기준으로 관련 자료 후보를 보여줍니다. 개인
            자료는 직접 공유하기 전까지 프로젝트룸에 보이지 않습니다.
          </p>
        </div>
        <div className="resource-suggestion__summary">
          <StatusBadge tone="agent">후보 제안</StatusBadge>
          <strong>5</strong>
          <span>오늘 확인할 자료</span>
          <ProgressBar label="자료 제안 확인율" value={68} />
        </div>
      </GlassPanel>

      <div className="resource-suggestion__grid">
        <GlassPanel className="resource-suggestion__bubble">
          <div className="resource-suggestion__bubble-top">
            <div>
              <h3>작업 중 표시되는 버블</h3>
              <p>현재 선택한 TODO와 일정에 맞는 자료만 작게 띄웁니다.</p>
            </div>
            <Chip>개인 영역</Chip>
          </div>

          <div className="resource-suggestion__bubble-preview">
            <div className="resource-suggestion__bubble-title">
              <span className="bubli-icon-tile" aria-hidden="true">
                <Star size={15} strokeWidth={2.1} />
              </span>
              <strong>자료 제안</strong>
              <span>3개 후보</span>
            </div>
            <div className="resource-suggestion__bubble-card">
              <StatusBadge tone="room">프로젝트룸 자료</StatusBadge>
              <h3>업무기준문서_최종본_v2.1.pdf</h3>
              <p>현재 작업의 검수 기준과 관련 있어요.</p>
              <div>
                <Button icon={<Pin size={14} />} size="sm" variant="primary">
                  고정
                </Button>
                <Button icon={<EyeOff size={14} />} size="sm" variant="quiet">
                  숨김
                </Button>
              </div>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="resource-suggestion__list">
          <div className="resource-suggestion__list-top">
            <div>
              <h3>제안 후보</h3>
              <p>제안은 확정이 아니며, 사용자의 고정/숨김/다시 보기 상태를 저장합니다.</p>
            </div>
            <Chip>항목 상태</Chip>
          </div>
          <div className="resource-suggestion__items">
            {resources.map((item) => (
              <ResourceSuggestionRow item={item} key={item.title} />
            ))}
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="resource-suggestion__flow">
        <Chip selected>작업 맥락</Chip>
        <ArrowRight size={16} strokeWidth={2.1} />
        <Chip>자료 후보</Chip>
        <ArrowRight size={16} strokeWidth={2.1} />
        <Chip>권한 확인</Chip>
        <ArrowRight size={16} strokeWidth={2.1} />
        <Chip selected>버블 표시</Chip>
      </GlassPanel>

      <div className="resource-suggestion__policy">
        <GlassPanel>
          <ShieldCheck size={18} strokeWidth={2.1} />
          <h3>권한 먼저 확인</h3>
          <p>사용자가 접근할 수 있는 프로젝트룸 자료와 개인 자료만 표시합니다.</p>
        </GlassPanel>
        <GlassPanel>
          <Pin size={18} strokeWidth={2.1} />
          <h3>고정 상태 저장</h3>
          <p>중요한 자료는 버블에 남기고, 같은 사용자에게 다시 보이게 합니다.</p>
        </GlassPanel>
        <GlassPanel>
          <X size={18} strokeWidth={2.1} />
          <h3>숨김 상태 저장</h3>
          <p>필요 없는 후보는 숨김 처리하고, 다음 제안에서 우선순위를 낮춥니다.</p>
        </GlassPanel>
      </div>
    </section>
  );
}
