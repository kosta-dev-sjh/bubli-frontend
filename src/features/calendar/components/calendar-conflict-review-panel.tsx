import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ListTodo,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./calendar-conflict-review-panel.module.css";

type CalendarConflictStatus = "MATCHED" | "NEEDS_REVIEW" | "BLOCKED";
type CalendarConflictKind = "TIME" | "TITLE" | "TASK_LINK" | "ROOM_SCOPE";

type CalendarConflict = {
  bubliValue: string;
  googleValue: string;
  kind: CalendarConflictKind;
  projectRoomName: string;
  status: CalendarConflictStatus;
  title: string;
};

type CalendarReviewRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type CalendarConflictReviewPanelProps = HTMLAttributes<HTMLElement> & {
  conflicts: CalendarConflict[];
  lastSyncedLabel: string;
  rules: CalendarReviewRule[];
  title?: string;
};

const conflictIcons: Record<CalendarConflictKind, typeof Clock3> = {
  ROOM_SCOPE: ShieldCheck,
  TASK_LINK: ListTodo,
  TIME: Clock3,
  TITLE: CalendarClock,
};

const statusMeta: Record<CalendarConflictStatus, { actionLabel: string; label: string; tone: StatusTone }> = {
  BLOCKED: { actionLabel: "권한 확인", label: "확인 보류", tone: "warning" },
  MATCHED: { actionLabel: "유지", label: "일치", tone: "approved" },
  NEEDS_REVIEW: { actionLabel: "확인", label: "확인 필요", tone: "pending" },
};

export const defaultCalendarConflicts: CalendarConflict[] = [
  {
    bubliValue: "6월 24일 14:00",
    googleValue: "6월 24일 15:00",
    kind: "TIME",
    projectRoomName: "프로젝트룸",
    status: "NEEDS_REVIEW",
    title: "1차 시안 검토",
  },
  {
    bubliValue: "클라이언트 확인 질문 보내기",
    googleValue: "질문 정리 미팅",
    kind: "TITLE",
    projectRoomName: "웹사이트 리뉴얼",
    status: "NEEDS_REVIEW",
    title: "질문 초안 확인",
  },
  {
    bubliValue: "TODO 2개 연결",
    googleValue: "연결된 작업 없음",
    kind: "TASK_LINK",
    projectRoomName: "Bubli 제품 개발룸",
    status: "MATCHED",
    title: "WBS 리뷰",
  },
  {
    bubliValue: "프로젝트룸 일정",
    googleValue: "개인 캘린더 일정",
    kind: "ROOM_SCOPE",
    projectRoomName: "디자인 검토 프로젝트룸",
    status: "BLOCKED",
    title: "외부 미팅",
  },
];

export const defaultCalendarReviewRules: CalendarReviewRule[] = [
  {
    description: "Bubli 일정은 서버에 저장된 일정을 원본으로 보고, Google Calendar 값은 비교 대상으로 표시합니다.",
    label: "서버 원본 기준",
    tone: "room",
  },
  {
    description: "시간, 제목, 연결된 TODO가 다르면 사용자가 확인한 값만 일정과 버블에 반영합니다.",
    label: "사용자 확인",
    tone: "approved",
  },
  {
    description: "외부 캘린더 접근은 연결된 계정과 프로젝트룸 접근 권한을 모두 확인합니다.",
    label: "권한 확인",
    tone: "warning",
  },
];

export function CalendarConflictReviewPanel({
  className,
  conflicts,
  lastSyncedLabel,
  rules,
  title = "일정 충돌 확인",
  ...props
}: CalendarConflictReviewPanelProps) {
  const reviewCount = conflicts.filter((conflict) => conflict.status !== "MATCHED").length;
  const matchedCount = conflicts.length - reviewCount;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<CalendarDays size={16} strokeWidth={2.1} />}>Bubli 일정</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              Bubli 일정과 Google Calendar 일정을 비교해 시간, 제목, TODO 연결 차이를 보여줍니다. 확인한 값만 서버
              일정과 버블 표시 데이터에 반영합니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>확인 필요</span>
          <strong>{reviewCount}건</strong>
          <StatusBadge tone="approved">일치 {matchedCount}건</StatusBadge>
        </div>
      </header>

      <section className={styles.syncCard} aria-label="캘린더 동기화 상태">
        <span className={styles.iconTile}>
          <RefreshCw size={18} strokeWidth={2.1} aria-hidden="true" />
        </span>
        <div>
          <strong>마지막 확인</strong>
          <p>{lastSyncedLabel}</p>
        </div>
        <Button icon={<ExternalLink size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
          연결 보기
        </Button>
      </section>

      <section className={styles.conflictList} aria-label="일정 충돌 목록">
        {conflicts.map((conflict) => {
          const ConflictIcon = conflictIcons[conflict.kind];
          const status = statusMeta[conflict.status];

          return (
            <article
              className={cn(styles.conflictCard, conflict.status !== "MATCHED" && styles.reviewCard)}
              key={`${conflict.projectRoomName}-${conflict.title}-${conflict.kind}`}
            >
              <div className={styles.conflictTop}>
                <span className={styles.iconTile}>
                  <ConflictIcon size={18} strokeWidth={2.1} aria-hidden="true" />
                </span>
                <div className={styles.conflictTitle}>
                  <strong>{conflict.title}</strong>
                  <span>{conflict.projectRoomName}</span>
                </div>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>

              <div className={styles.valueGrid}>
                <div>
                  <span>Bubli</span>
                  <b>{conflict.bubliValue}</b>
                </div>
                <div>
                  <span>Google Calendar</span>
                  <b>{conflict.googleValue}</b>
                </div>
              </div>

              <footer className={styles.conflictFooter}>
                <span>
                  <AlertTriangle size={15} strokeWidth={2.1} aria-hidden="true" />
                  {conflict.kind.toLowerCase()}
                </span>
                <Button size="sm" variant={conflict.status === "MATCHED" ? "ghost" : "quiet"}>
                  {status.actionLabel}
                </Button>
              </footer>
            </article>
          );
        })}
      </section>

      <section className={styles.ruleGrid} aria-label="일정 확인 기준">
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
