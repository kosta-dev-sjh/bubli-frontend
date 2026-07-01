import {
  CheckCircle2,
  Cloud,
  Database,
  FileCheck2,
  FolderSync,
  HardDrive,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./managed-folder-s3-handoff-panel.module.css";

type FolderEventStatus = "INDEXED" | "UPLOAD_WAITING" | "REVIEW_NEEDED" | "LINKED";
type HandoffTarget = "PERSONAL_RESOURCE" | "ROOM_RESOURCE" | "NEW_VERSION";

type FolderEvent = {
  eventLabel: string;
  fileName: string;
  status: FolderEventStatus;
  target: HandoffTarget;
  updatedLabel: string;
};

type HandoffRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type ManagedFolderS3HandoffPanelProps = HTMLAttributes<HTMLElement> & {
  events: FolderEvent[];
  folderName: string;
  quotaPercent: number;
  rules: HandoffRule[];
  selectedProjectRoom: string;
  title?: string;
};

const statusMeta: Record<FolderEventStatus, { actionLabel: string; label: string; tone: StatusTone }> = {
  INDEXED: { actionLabel: "보기", label: "색인됨", tone: "personal" },
  LINKED: { actionLabel: "열기", label: "자료 연결", tone: "approved" },
  REVIEW_NEEDED: { actionLabel: "선택", label: "확인 필요", tone: "warning" },
  UPLOAD_WAITING: { actionLabel: "업로드", label: "대기", tone: "pending" },
};

const targetMeta: Record<HandoffTarget, { label: string; tone: StatusTone }> = {
  NEW_VERSION: { label: "새 버전", tone: "agent" },
  PERSONAL_RESOURCE: { label: "개인 자료", tone: "personal" },
  ROOM_RESOURCE: { label: "프로젝트룸 자료", tone: "room" },
};

export const defaultFolderEvents: FolderEvent[] = [
  {
    eventLabel: "파일 수정",
    fileName: "작업 범위_v3.pdf",
    status: "REVIEW_NEEDED",
    target: "NEW_VERSION",
    updatedLabel: "오늘 11:08",
  },
  {
    eventLabel: "파일 추가",
    fileName: "회의 후 질문.md",
    status: "UPLOAD_WAITING",
    target: "PERSONAL_RESOURCE",
    updatedLabel: "오늘 10:42",
  },
  {
    eventLabel: "서버 반영",
    fileName: "요구사항 정리.docx",
    status: "LINKED",
    target: "ROOM_RESOURCE",
    updatedLabel: "어제 18:20",
  },
];

export const defaultFolderHandoffRules: HandoffRule[] = [
  {
    description: "데스크탑 앱은 사용자가 지정한 관리 폴더의 변경 상태를 기기 안 색인에 남깁니다.",
    label: "기기 안 색인",
    tone: "personal",
  },
  {
    description: "파일 업로드는 서버 권한 확인을 거친 뒤 자료보드에 연결됩니다.",
    label: "서버 업로드",
    tone: "room",
  },
  {
    description: "수정된 파일은 사용자가 새 버전으로 반영할지 선택한 뒤 버전 기록에 남깁니다.",
    label: "버전 선택",
    tone: "approved",
  },
];

export function ManagedFolderS3HandoffPanel({
  className,
  events,
  folderName,
  quotaPercent,
  rules,
  selectedProjectRoom,
  title = "관리 폴더 업로드 흐름",
  ...props
}: ManagedFolderS3HandoffPanelProps) {
  const reviewCount = events.filter((event) => event.status === "REVIEW_NEEDED").length;
  const waitingCount = events.filter((event) => event.status === "UPLOAD_WAITING").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<FolderSync size={16} strokeWidth={2.1} />}>변경 후보</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              관리 폴더에서 발견한 변경은 곧바로 자료보드에 반영되지 않습니다. 앱이 기기 안 상태를 기록하고,
              사용자가 선택한 파일만 서버 검증을 거쳐 자료로 연결됩니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{folderName}</span>
          <strong>{selectedProjectRoom}</strong>
          <StatusBadge tone="warning">확인 {reviewCount}개</StatusBadge>
        </div>
      </header>

      <section className={styles.flowGrid} aria-label="관리 폴더 자료 반영 흐름">
        <article className={styles.flowCard}>
          <span className={styles.iconTile}>
            <HardDrive size={19} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <StatusBadge tone="personal">기기 안 기록</StatusBadge>
            <h3>관리 폴더</h3>
            <p>지정 폴더의 추가, 수정, 삭제 상태를 기기 안 색인에 기록합니다.</p>
          </div>
        </article>

        <article className={styles.centerCard}>
          <span className={styles.iconTile}>
            <ShieldCheck size={20} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <Chip selected>사용자 선택</Chip>
          <h3>개인 자료 또는 프로젝트룸 자료로 반영</h3>
          <p>새 파일, 수정 파일, 삭제 후보를 확인한 뒤 업로드와 버전 반영을 진행합니다.</p>
          <ProgressBar label="관리 폴더 용량 사용률" value={quotaPercent} />
          <Button icon={<RefreshCw size={15} strokeWidth={2.1} />} size="sm" variant="secondary">
            변경 항목 확인
          </Button>
        </article>

        <article className={styles.flowCard}>
          <span className={styles.iconTile}>
            <Cloud size={19} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <StatusBadge tone="room">서버 저장</StatusBadge>
            <h3>자료보드 연결</h3>
            <p>업로드된 파일은 자료보드에서 권한과 버전 기준으로 다시 조회됩니다.</p>
          </div>
        </article>
      </section>

      <section className={styles.metrics} aria-label="관리 폴더 업로드 요약">
        <article>
          <span>용량 사용률</span>
          <strong>{quotaPercent}%</strong>
          <StatusBadge tone={quotaPercent > 80 ? "warning" : "approved"}>제한 확인</StatusBadge>
        </article>
        <article>
          <span>업로드 대기</span>
          <strong>{waitingCount}</strong>
          <StatusBadge tone="pending">선택 필요</StatusBadge>
        </article>
        <article>
          <span>확인 필요</span>
          <strong>{reviewCount}</strong>
          <StatusBadge tone="warning">버전 확인</StatusBadge>
        </article>
      </section>

      <section className={styles.eventList} aria-label="관리 폴더 변경 목록">
        {events.map((event) => {
          const status = statusMeta[event.status];
          const target = targetMeta[event.target];

          return (
            <article className={styles.eventCard} key={`${event.fileName}-${event.updatedLabel}`}>
              <span className={styles.iconTile}>
                {event.status === "LINKED" ? (
                  <FileCheck2 size={18} strokeWidth={2.1} aria-hidden="true" />
                ) : (
                  <Database size={18} strokeWidth={2.1} aria-hidden="true" />
                )}
              </span>
              <div className={styles.eventMain}>
                <strong>{event.fileName}</strong>
                <span>
                  {event.eventLabel} · {event.updatedLabel}
                </span>
              </div>
              <StatusBadge tone={target.tone}>{target.label}</StatusBadge>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              <Button size="sm" variant={event.status === "REVIEW_NEEDED" ? "secondary" : "quiet"}>
                {status.actionLabel}
              </Button>
            </article>
          );
        })}
      </section>

      <section className={styles.ruleGrid} aria-label="관리 폴더 저장 기준">
        {rules.map((rule) => (
          <article key={rule.label}>
            <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
            <div>
              <StatusBadge tone={rule.tone}>{rule.label}</StatusBadge>
              <p>{rule.description}</p>
            </div>
          </article>
        ))}
      </section>
    </GlassPanel>
  );
}
