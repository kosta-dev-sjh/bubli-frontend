import { Archive, CheckCircle2, Database, HardDrive, MessageCircle, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type MemoryItem = {
  label: string;
  description: string;
  status: "local" | "summary" | "backup";
  value: string;
};

const memoryItems: MemoryItem[] = [
  {
    description: "최근 개인 에이전트 대화 원문",
    label: "최근 원문 대화",
    status: "local",
    value: "최근 96개",
  },
  {
    description: "하루정리에 참조할 기기 안 요약",
    label: "기기 안 요약",
    status: "summary",
    value: "3개",
  },
  {
    description: "암호화된 기기 안 백업 목록",
    label: "기기 안 백업 목록",
    status: "backup",
    value: "최근 7개",
  },
];

const statusMeta: Record<MemoryItem["status"], { label: string; tone: "personal" | "agent" | "success" }> = {
  backup: { label: "백업", tone: "success" },
  local: { label: "기기 안 원문", tone: "personal" },
  summary: { label: "요약", tone: "agent" },
};

function MemoryItemCard({ item }: { item: MemoryItem }) {
  const status = statusMeta[item.status];

  return (
    <article className="local-agent-memory-card">
      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      <h3>{item.label}</h3>
      <strong>{item.value}</strong>
      <p>{item.description}</p>
    </article>
  );
}

export function LocalAgentMemoryPanel() {
  return (
    <section className="local-agent-memory" aria-label="개인 에이전트 로컬 기억">
      <GlassPanel className="local-agent-memory__hero">
        <div className="local-agent-memory__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <Sparkles size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>개인 에이전트</Chip>
            <h2>개인 대화 원문은 기기 안에 두고, 사용자가 확인한 요약만 서버에 남깁니다</h2>
            <p>
              개인 에이전트의 최근 대화는 기기 안에 단기기억으로 저장합니다. 하루정리로 보낼 내용은 사용자가
              확인한 요약만 저장 흐름에 연결합니다.
            </p>
          </div>
        </div>
        <div className="local-agent-memory__usage">
          <StatusBadge tone="personal">로컬 저장</StatusBadge>
          <strong>96</strong>
          <span>최근 메시지</span>
          <ProgressBar label="단기기억 사용량" value={96} />
        </div>
      </GlassPanel>

      <div className="local-agent-memory__grid">
        <GlassPanel className="local-agent-memory__panel">
          <div className="local-agent-memory__panel-header">
            <div>
              <h3>기억과 백업 상태</h3>
              <p>최근 100개를 기준으로 유지하고, 초과분은 요약하거나 삭제 후보로 보냅니다.</p>
            </div>
            <Chip icon={<HardDrive size={14} />}>기기 안 저장소</Chip>
          </div>

          <div className="local-agent-memory__cards">
            {memoryItems.map((item) => (
              <MemoryItemCard item={item} key={item.label} />
            ))}
          </div>

          <footer className="local-agent-memory__actions">
            <Button icon={<Archive size={15} />} size="sm" variant="primary">
              기기 안 백업 만들기
            </Button>
            <Button icon={<RotateCcw size={15} />} size="sm" variant="quiet">
              무결성 검사
            </Button>
          </footer>
        </GlassPanel>

        <GlassPanel className="local-agent-memory__policy">
          <h3>서버와 나누는 기준</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <MessageCircle size={16} strokeWidth={2.1} />
            </span>
            <p>개인 에이전트 원문 대화는 서버에 저장하지 않습니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <CheckCircle2 size={16} strokeWidth={2.1} />
            </span>
            <p>사용자가 확인한 하루정리 결과만 다시 볼 수 있게 저장합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Database size={16} strokeWidth={2.1} />
            </span>
            <p>프로젝트룸 채팅은 협업 기록이므로 서버 기록을 기준으로 봅니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>기기 안 백업은 해당 기기에 보관하고, 복구 실패 시 원문 복구가 불가능함을 안내합니다.</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
