import { CheckCircle2, FileText, FolderOpen, HardDrive, ListFilter, LockKeyhole, Pin, Save, Search } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./memo-list-panel.module.css";

export type MemoScope = "PERSONAL" | "PROJECT_ROOM";
export type MemoStatus = "LOCAL_DRAFT" | "SAVED" | "PINNED";

export type MemoListItem = {
  body: string;
  id: string;
  projectRoomLabel?: string;
  scope: MemoScope;
  status: MemoStatus;
  title: string;
  updatedLabel: string;
};

export type MemoListPanelProps = HTMLAttributes<HTMLElement> & {
  memos?: MemoListItem[];
  onOpenMemo?: (memoId: string) => void;
  onSaveDraft?: (memoId: string) => void;
  selectedMemoId?: string;
};

const statusMeta: Record<MemoStatus, { label: string; tone: StatusTone }> = {
  LOCAL_DRAFT: { label: "작성 중", tone: "pending" },
  PINNED: { label: "고정", tone: "memo" },
  SAVED: { label: "저장됨", tone: "success" },
};

const scopeMeta: Record<MemoScope, { label: string; tone: StatusTone }> = {
  PERSONAL: { label: "개인 메모", tone: "personal" },
  PROJECT_ROOM: { label: "프로젝트룸 메모", tone: "room" },
};

export const defaultMemoList: MemoListItem[] = [
  {
    body: "업무 문서에는 2회 무상 수정, 회의록에는 페이지별 수정이라는 표현이 있어 확인 필요 항목으로 남겨둡니다.",
    id: "memo-contract-scope",
    projectRoomLabel: "번역 자료 검토",
    scope: "PROJECT_ROOM",
    status: "LOCAL_DRAFT",
    title: "수정 범위 확인 메모",
    updatedLabel: "로컬 초안 2분 전",
  },
  {
    body: "발표에서는 자료 업로드, 후보 확인, TODO 반영, 데스크탑 표시 흐름만 짧게 보여줍니다.",
    id: "memo-presentation-flow",
    projectRoomLabel: "Bubli 자료 정리",
    scope: "PROJECT_ROOM",
    status: "PINNED",
    title: "발표 흐름 정리",
    updatedLabel: "서버 저장 18분 전",
  },
  {
    body: "작업 전 떠오른 질문을 개인 메모로 남기고, 필요하면 프로젝트룸 자료와 연결합니다.",
    id: "memo-personal-question",
    scope: "PERSONAL",
    status: "SAVED",
    title: "회의 전 질문",
    updatedLabel: "서버 저장 오늘 13:40",
  },
];

export function MemoListPanel({
  className,
  memos = defaultMemoList,
  onOpenMemo,
  onSaveDraft,
  selectedMemoId = memos[0]?.id,
  ...props
}: MemoListPanelProps) {
  const selectedMemo = memos.find((memo) => memo.id === selectedMemoId) ?? memos[0];
  const localDraftCount = memos.filter((memo) => memo.status === "LOCAL_DRAFT").length;
  const projectRoomMemoCount = memos.filter((memo) => memo.scope === "PROJECT_ROOM").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FileText size={15} strokeWidth={2.1} />}>메모</Chip>
          <div>
            <h2 className={styles.title}>작업 중 남긴 메모를 다시 찾습니다</h2>
            <p className={styles.description}>
              작성 중 초안은 내 기기에 먼저 남기고, 사용자가 저장한 메모만 웹과 앱에서 함께 볼 수 있게 반영합니다.
            </p>
          </div>
        </div>
        <Button icon={<Search size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          메모 찾기
        </Button>
      </header>

      <section className={styles.summaryGrid} aria-label="메모 요약">
        <article>
          <HardDrive size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>로컬 초안</span>
          <strong>{localDraftCount}개</strong>
          <p>비정상 종료 복구 대상</p>
        </article>
        <article>
          <FolderOpen size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>프로젝트룸 메모</span>
          <strong>{projectRoomMemoCount}개</strong>
          <p>자료와 작업 맥락 연결</p>
        </article>
        <article>
          <LockKeyhole size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>개인 메모</span>
          <strong>{memos.length - projectRoomMemoCount}개</strong>
          <p>공유 전까지 개인 영역</p>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.listPanel} aria-label="메모 목록">
          <div className={styles.sectionTitle}>
            <strong>최근 메모</strong>
            <StatusBadge tone="memo">{memos.length}개</StatusBadge>
          </div>
          <div className={styles.memoStack}>
            {memos.map((memo) => {
              const status = statusMeta[memo.status];
              const scope = scopeMeta[memo.scope];
              const selected = memo.id === selectedMemo?.id;

              return (
                <button
                  className={cn(styles.memoRow, selected && styles.memoRowSelected)}
                  key={memo.id}
                  onClick={() => onOpenMemo?.(memo.id)}
                  type="button"
                >
                  <span className={styles.memoIcon} aria-hidden="true">
                    {memo.status === "PINNED" ? <Pin size={16} strokeWidth={2.1} /> : <FileText size={16} strokeWidth={2.1} />}
                  </span>
                  <span className={styles.memoCopy}>
                    <b>{memo.title}</b>
                    <small>{memo.projectRoomLabel ?? "개인 작업"} · {memo.updatedLabel}</small>
                  </span>
                  <span className={styles.memoBadges}>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    <StatusBadge tone={scope.tone}>{scope.label}</StatusBadge>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className={styles.detailPanel} aria-label="메모 상세">
          {selectedMemo ? (
            <>
              <div className={styles.sectionTitle}>
                <strong>{selectedMemo.title}</strong>
                <StatusBadge tone={statusMeta[selectedMemo.status].tone}>{statusMeta[selectedMemo.status].label}</StatusBadge>
              </div>
              <p className={styles.memoBody}>{selectedMemo.body}</p>
              <div className={styles.detailMeta}>
                <span>{selectedMemo.projectRoomLabel ?? "개인 작업"}</span>
                <span>{selectedMemo.updatedLabel}</span>
                <span>{scopeMeta[selectedMemo.scope].label}</span>
              </div>
              <div className={styles.detailActions}>
                <Button icon={<Save size={15} strokeWidth={2.1} />} onClick={() => onSaveDraft?.(selectedMemo.id)} variant="primary">
                  저장
                </Button>
                <Button icon={<Pin size={15} strokeWidth={2.1} />} variant="quiet">
                  고정
                </Button>
              </div>
            </>
          ) : (
            <div className={styles.emptyDetail}>
              <ListFilter size={22} strokeWidth={2.1} aria-hidden="true" />
              <strong>열 메모가 없습니다</strong>
              <p>작업 중 떠오른 내용을 빠른 메모로 남기면 여기에서 다시 볼 수 있습니다.</p>
            </div>
          )}
        </aside>
      </div>

      <section className={styles.policyStrip} aria-label="메모 저장 기준">
        <span>
          <HardDrive size={15} strokeWidth={2.1} aria-hidden="true" />
          작성 중 초안은 로컬 복구 대상
        </span>
        <span>
          <CheckCircle2 size={15} strokeWidth={2.1} aria-hidden="true" />
          저장한 메모만 서버 반영
        </span>
        <span>개인 메모는 공유 전까지 프로젝트룸에 보이지 않습니다</span>
      </section>
    </GlassPanel>
  );
}
