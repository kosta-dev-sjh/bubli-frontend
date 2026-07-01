import { CheckCircle2, Database, FolderCheck, FolderOpen, HardDrive, RefreshCw, ShieldCheck, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type FolderEvent = {
  title: string;
  path: string;
  status: "indexed" | "changed" | "pending";
  detail: string;
};

const folderEvents: FolderEvent[] = [
  {
    detail: "개인 자료로만 표시",
    path: "~/Documents/Bubli/작업범위",
    status: "indexed",
    title: "기준 자료_최종본.pdf",
  },
  {
    detail: "변경 감지 후 다시 색인",
    path: "~/Documents/Bubli/회의록",
    status: "changed",
    title: "회의록_0618.md",
  },
  {
    detail: "네트워크 복구 후 동기화 대기",
    path: "~/Documents/Bubli/참고자료",
    status: "pending",
    title: "용어집.xlsx",
  },
];

const statusMeta: Record<FolderEvent["status"], { label: string; tone: "success" | "pending" | "warning" }> = {
  changed: { label: "변경 감지", tone: "warning" },
  indexed: { label: "색인 완료", tone: "success" },
  pending: { label: "대기", tone: "pending" },
};

function FolderEventRow({ item }: { item: FolderEvent }) {
  const status = statusMeta[item.status];

  return (
    <article className="managed-folder-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FolderOpen size={16} strokeWidth={2.1} />
      </span>
      <div>
        <div className="managed-folder-row__meta">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{item.path}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.detail}</p>
      </div>
    </article>
  );
}

export function ManagedFolderIndexPanel() {
  return (
    <section className="managed-folder" aria-label="개인 관리 폴더 색인">
      <GlassPanel className="managed-folder__hero">
        <div>
          <Chip icon={<HardDrive size={14} />} selected>
            개인 관리 폴더
          </Chip>
          <h2>사용자가 지정한 폴더만 감지하고, 먼저 개인 자료로 정리합니다</h2>
          <p>
            데스크탑 앱은 사용자가 선택한 기기 폴더의 파일 변경을 감지합니다. 색인된 파일은 개인 자료로 남고,
            프로젝트룸에 공유하려면 사용자의 승인이 필요합니다.
          </p>
        </div>
        <div className="managed-folder__summary">
          <StatusBadge tone="personal">기기 안 색인</StatusBadge>
          <strong>128</strong>
          <span>관리 중인 파일</span>
          <ProgressBar label="오늘 폴더 색인 진행률" value={82} />
        </div>
      </GlassPanel>

      <div className="managed-folder__grid">
        <GlassPanel className="managed-folder__list">
          <div className="managed-folder__list-top">
            <div>
              <h3>최근 감지 결과</h3>
              <p>파일 추가, 수정, 삭제를 감지해 개인 자료보드 표시 상태를 갱신합니다.</p>
            </div>
            <Button icon={<RefreshCw size={15} />} size="sm" variant="quiet">
              다시 색인
            </Button>
          </div>
          <div className="managed-folder__items">
            {folderEvents.map((item) => (
              <FolderEventRow item={item} key={`${item.path}-${item.title}`} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="managed-folder__policy">
          <h3>처리 기준</h3>
          <div>
            <FolderCheck size={17} strokeWidth={2.1} />
            <p>사용자가 직접 선택한 폴더만 감지합니다. 전체 PC를 자동으로 훑지 않습니다.</p>
          </div>
          <div>
            <Database size={17} strokeWidth={2.1} />
            <p>빠른 표시와 변경 감지는 기기 안 저장소와 색인 상태를 우선 사용합니다.</p>
          </div>
          <div>
            <ShieldCheck size={17} strokeWidth={2.1} />
            <p>색인된 파일은 기본적으로 개인 자료이며, 프로젝트룸 자료가 아닙니다.</p>
          </div>
          <div>
            <UploadCloud size={17} strokeWidth={2.1} />
            <p>프로젝트룸 공유는 사용자가 선택한 파일을 승인한 뒤 별도 흐름으로 진행합니다.</p>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="managed-folder__flow">
        <Chip selected>폴더 선택</Chip>
        <CheckCircle2 size={16} strokeWidth={2.1} />
        <Chip>변경 감지</Chip>
        <CheckCircle2 size={16} strokeWidth={2.1} />
        <Chip>개인 자료 표시</Chip>
        <CheckCircle2 size={16} strokeWidth={2.1} />
        <Chip selected>공유는 별도 승인</Chip>
      </GlassPanel>
    </section>
  );
}
