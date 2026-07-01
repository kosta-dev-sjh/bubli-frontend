import { Clock3, FileClock, FileText, Link2, MessageSquareText, RotateCcw, ShieldCheck, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type VersionItem = {
  version: string;
  title: string;
  updatedAt: string;
  status: "current" | "previous" | "review";
  note: string;
};

const versions: VersionItem[] = [
  {
    note: "검수 기준 문구가 추가됨",
    status: "current",
    title: "업무기준서_최종본_v2.1.pdf",
    updatedAt: "오늘 14:32",
    version: "v2.1",
  },
  {
    note: "납품일 표현이 회의록과 달라 확인 필요",
    status: "review",
    title: "업무기준서_최종본_v2.pdf",
    updatedAt: "어제 18:10",
    version: "v2.0",
  },
  {
    note: "초안 보관",
    status: "previous",
    title: "업무기준서_초안.pdf",
    updatedAt: "6월 18일 09:20",
    version: "v1.0",
  },
];

const statusMeta: Record<VersionItem["status"], { label: string; tone: "success" | "pending" | "neutral" }> = {
  current: { label: "현재 버전", tone: "success" },
  previous: { label: "이전 버전", tone: "neutral" },
  review: { label: "확인 필요", tone: "pending" },
};

function VersionRow({ item }: { item: VersionItem }) {
  const status = statusMeta[item.status];

  return (
    <article className="resource-version-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileClock size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="resource-version-row__meta">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{item.version}</span>
          <span>{item.updatedAt}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.note}</p>
      </div>
      <Button size="sm" variant="quiet">
        보기
      </Button>
    </article>
  );
}

export function ResourceVersionHistoryPanel() {
  return (
    <section className="resource-version" aria-label="자료 버전 히스토리">
      <GlassPanel className="resource-version__hero">
        <div>
          <Chip icon={<FileText size={14} />} selected>
            자료 상세
          </Chip>
          <h2>같은 파일을 다시 올려도 덮어쓰지 않고 새 버전으로 남깁니다</h2>
          <p>
            자료보드는 업무 기준 문서, 요구사항, 회의록처럼 계속 바뀌는 파일의 흐름을 남깁니다. 프로젝트룸 자료는 멤버가
            같은 이력을 보고, 개인 자료는 공유하기 전까지 본인만 확인합니다.
          </p>
        </div>
        <div className="resource-version__summary">
          <StatusBadge tone="room">버전 관리</StatusBadge>
          <strong>3</strong>
          <span>보관된 버전</span>
          <ProgressBar label="현재 자료 검토 진행률" value={66} />
        </div>
      </GlassPanel>

      <div className="resource-version__grid">
        <GlassPanel className="resource-version__list">
          <div className="resource-version__list-top">
            <div>
              <h3>버전 히스토리</h3>
              <p>새 파일 업로드는 기존 파일을 지우지 않고, 같은 자료의 새 버전으로 남깁니다.</p>
            </div>
            <Button icon={<UploadCloud size={15} />} size="sm" variant="primary">
              새 버전 올리기
            </Button>
          </div>
          <div className="resource-version__items">
            {versions.map((item) => (
              <VersionRow item={item} key={`${item.version}-${item.title}`} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="resource-version__side">
          <h3>자료 맥락</h3>
          <div>
            <MessageSquareText size={17} strokeWidth={2.1} />
            <p>댓글은 자료를 기준으로 남기고, 대화와 섞이지 않게 봅니다.</p>
          </div>
          <div>
            <Link2 size={17} strokeWidth={2.1} />
            <p>관련 문서는 업무 기준 문서, 견적서, 요구사항, 회의록을 같은 맥락으로 묶습니다.</p>
          </div>
          <div>
            <ShieldCheck size={17} strokeWidth={2.1} />
            <p>프로젝트룸 자료는 멤버 권한을 확인하고, 개인 자료는 직접 공유 전까지 숨깁니다.</p>
          </div>
          <div>
            <RotateCcw size={17} strokeWidth={2.1} />
            <p>이전 버전은 비교와 확인용으로 남기고, 현재 버전을 따로 표시합니다.</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="resource-version__comment">
        <Clock3 size={18} strokeWidth={2.1} />
        <p>김민준 님이 “검수 일정은 7월 15일 기준으로 다시 확인 필요” 댓글을 남겼습니다.</p>
        <Chip>댓글 2개</Chip>
      </GlassPanel>
    </section>
  );
}
