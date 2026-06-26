import { CheckCircle2, Database, FileSearch, FolderOpen, HardDrive, RefreshCw, ShieldCheck, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";

type LocalFileEventStatus = "suggested" | "approved" | "queued" | "synced";

type LocalFileEvent = {
  fileName: string;
  folderName: string;
  modifiedAt: string;
  projectHint: string;
  status: LocalFileEventStatus;
  type: "new" | "changed" | "deleted";
};

const localEvents: LocalFileEvent[] = [
  {
    fileName: "번역계약서_v3.pdf",
    folderName: "Bubli/번역 계약서 정리",
    modifiedAt: "방금 전",
    projectHint: "번역 계약서 정리",
    status: "suggested",
    type: "changed",
  },
  {
    fileName: "회의록_0622.md",
    folderName: "Bubli/웹사이트 리뉴얼",
    modifiedAt: "12분 전",
    projectHint: "웹사이트 리뉴얼",
    status: "approved",
    type: "new",
  },
  {
    fileName: "요구사항_초안.docx",
    folderName: "Bubli/브랜드 소개서",
    modifiedAt: "35분 전",
    projectHint: "브랜드 소개서",
    status: "queued",
    type: "changed",
  },
  {
    fileName: "이전_견적서.xlsx",
    folderName: "Bubli/정기 운영 업무",
    modifiedAt: "1시간 전",
    projectHint: "정기 운영 업무",
    status: "synced",
    type: "deleted",
  },
];

const statusMeta: Record<LocalFileEventStatus, { label: string; tone: "pending" | "approved" | "warning" | "success" }> = {
  approved: { label: "승인됨", tone: "approved" },
  queued: { label: "대기열", tone: "warning" },
  suggested: { label: "승인 필요", tone: "pending" },
  synced: { label: "반영 완료", tone: "success" },
};

const eventTypeCopy: Record<LocalFileEvent["type"], string> = {
  changed: "수정 감지",
  deleted: "삭제 감지",
  new: "새 파일",
};

function LocalFileEventRow({ event }: { event: LocalFileEvent }) {
  const status = statusMeta[event.status];

  return (
    <article className="managed-folder-row">
      <span className="bubli-icon-tile" aria-hidden="true">
        <FileSearch size={17} strokeWidth={2.1} />
      </span>
      <div className="managed-folder-row__body">
        <div className="managed-folder-row__meta">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span>{eventTypeCopy[event.type]}</span>
          <span>{event.modifiedAt}</span>
        </div>
        <h3>{event.fileName}</h3>
        <p>{event.folderName}</p>
        <footer>
          <Chip icon={<FolderOpen size={14} />}>{event.projectHint}</Chip>
          {event.status === "suggested" ? (
            <Button icon={<CheckCircle2 size={14} />} size="sm" variant="primary">
              서버 반영 승인
            </Button>
          ) : null}
        </footer>
      </div>
    </article>
  );
}

export function ManagedFolderSyncPanel() {
  return (
    <section className="managed-folder-sync" aria-label="개인 관리 폴더 동기화">
      <GlassPanel className="managed-folder-sync__hero">
        <div className="managed-folder-sync__title">
          <span className="bubli-icon-tile" aria-hidden="true">
            <FolderOpen size={18} strokeWidth={2.1} />
          </span>
          <div>
            <Chip selected>개인 관리 폴더</Chip>
            <h2>로컬 폴더 변화는 먼저 감지하고, 사용자가 승인한 것만 서버에 반영합니다</h2>
            <p>앱이 선택한 폴더를 감시하고, 변경 후보는 전송 대기 목록에 남긴 뒤 중복 없이 반영합니다.</p>
          </div>
        </div>
        <div className="managed-folder-sync__summary">
          <strong>342</strong>
          <span>색인된 파일</span>
          <ProgressBar label="저장 용량" value={68} />
        </div>
      </GlassPanel>

      <div className="managed-folder-sync__grid">
        <GlassPanel className="managed-folder-sync__panel">
          <div className="managed-folder-sync__toolbar">
            <h3>감지된 변경</h3>
            <div>
              <Button icon={<RefreshCw size={15} />} size="sm" variant="quiet">
                다시 스캔
              </Button>
              <Button icon={<UploadCloud size={15} />} size="sm" variant="primary">
                승인 항목 반영
              </Button>
            </div>
          </div>
          <div className="managed-folder-sync__list">
            {localEvents.map((event) => (
              <LocalFileEventRow event={event} key={`${event.folderName}-${event.fileName}`} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="managed-folder-sync__policy">
          <h3>저장과 권한 기준</h3>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <HardDrive size={16} strokeWidth={2.1} />
            </span>
            <p>파일 변경 감지와 색인 상태는 기기 안 임시 저장소에 먼저 저장합니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <ShieldCheck size={16} strokeWidth={2.1} />
            </span>
            <p>사용자가 승인하지 않은 로컬 파일은 서버 자료로 등록하지 않습니다.</p>
          </div>
          <div>
            <span className="bubli-icon-tile" aria-hidden="true">
              <Database size={16} strokeWidth={2.1} />
            </span>
            <p>전송 실패 작업은 대기 목록에 남기고 같은 작업이 두 번 반영되지 않게 재시도합니다.</p>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}
