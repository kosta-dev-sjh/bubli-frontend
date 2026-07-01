import { ArrowRight, CheckCircle2, FileLock2, FolderOpen, History, ShieldCheck, UploadCloud, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type ResourceShareItem = {
  name: string;
  currentScope: "개인 자료" | "프로젝트룸 자료";
  nextAction: string;
  status: "private" | "review" | "shared";
};

const shareItems: ResourceShareItem[] = [
  {
    currentScope: "개인 자료",
    name: "개인 메모_자료 검토.md",
    nextAction: "공유 전 검토",
    status: "private",
  },
  {
    currentScope: "개인 자료",
    name: "회의 질문 후보.md",
    nextAction: "프로젝트룸 자료로 공유",
    status: "review",
  },
  {
    currentScope: "프로젝트룸 자료",
    name: "작업범위_v2.pdf",
    nextAction: "버전 히스토리 확인",
    status: "shared",
  },
];

const statusMeta: Record<ResourceShareItem["status"], { label: string; tone: "personal" | "pending" | "room" }> = {
  private: { label: "본인만 보기", tone: "personal" },
  review: { label: "공유 검토", tone: "pending" },
  shared: { label: "멤버와 공유", tone: "room" },
};

function ResourceShareRow({ item }: { item: ResourceShareItem }) {
  const status = statusMeta[item.status];

  return (
    <article className="resource-sharing-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileLock2 size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="resource-sharing-row__meta">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{item.currentScope}</span>
        </div>
        <h3>{item.name}</h3>
        <p>{item.nextAction}</p>
      </div>
      <Button size="sm" variant={item.status === "review" ? "primary" : "quiet"}>
        {item.status === "review" ? "공유 승인" : "열기"}
      </Button>
    </article>
  );
}

export function ResourceSharingPermissionPanel() {
  return (
    <section className="resource-sharing" aria-label="자료보드 권한과 공유">
      <GlassPanel className="resource-sharing__hero">
        <div className="resource-sharing__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <FolderOpen size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>자료보드</Chip>
            <h2>개인 자료는 직접 공유하기 전까지 프로젝트룸에 보이지 않습니다</h2>
            <p>
              자료보드는 개인 자료와 프로젝트룸 자료를 함께 찾는 화면입니다. 개인 자료는 사용자에게 귀속되고,
              프로젝트룸 자료는 해당 프로젝트룸 멤버가 함께 보는 자료입니다.
            </p>
          </div>
        </div>
        <div className="resource-sharing__summary">
          <StatusBadge tone="personal">권한 분리</StatusBadge>
          <strong>2단계</strong>
          <span>검토 후 공유</span>
          <ProgressBar label="자료 공유 준비도" value={62} />
        </div>
      </GlassPanel>

      <div className="resource-sharing__grid">
        <GlassPanel className="resource-sharing__panel">
          <div className="resource-sharing__panel-header">
            <div>
              <h3>공유 후보</h3>
              <p>개인 자료를 프로젝트룸 자료로 바꿀 때는 사용자의 명시적인 승인이 필요합니다.</p>
            </div>
            <Chip icon={<UploadCloud size={14} />}>자료 범위</Chip>
          </div>

          <div className="resource-sharing__list">
            {shareItems.map((item) => (
              <ResourceShareRow item={item} key={item.name} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="resource-sharing__policy">
          <h3>권한 기준</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>개인 자료는 본인만 볼 수 있는 자료로 저장합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <UsersRound size={16} strokeWidth={2.1} />
            </span>
            <p>프로젝트룸 자료는 프로젝트룸 멤버 권한을 확인한 뒤 함께 볼 수 있습니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <History size={16} strokeWidth={2.1} />
            </span>
            <p>같은 파일을 다시 올리면 덮어쓰지 않고 새 버전으로 남깁니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <CheckCircle2 size={16} strokeWidth={2.1} />
            </span>
            <p>에이전트가 만든 자료 제안은 후보이며, 공유 상태 변경은 사용자 승인 후 반영합니다.</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="resource-sharing__flow">
        <Chip selected>개인 자료</Chip>
        <ArrowRight size={16} strokeWidth={2.1} />
        <Chip>사용자 승인</Chip>
        <ArrowRight size={16} strokeWidth={2.1} />
        <Chip selected>프로젝트룸 자료</Chip>
      </GlassPanel>
    </section>
  );
}
