import {
  Archive,
  CheckCircle2,
  Cloud,
  FileClock,
  HardDrive,
  LockKeyhole,
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

import styles from "./personal-agent-summary-boundary-panel.module.css";

type StorageSide = "LOCAL_ONLY" | "LOCAL_SUMMARY" | "SERVER_APPROVED";
type BoundaryStatus = "ACTIVE" | "READY" | "SAVED";

type BoundaryItem = {
  description: string;
  label: string;
  side: StorageSide;
  status: BoundaryStatus;
};

type SummaryInput = {
  label: string;
  source: string;
  tone: StatusTone;
  value: string;
};

export type PersonalAgentSummaryBoundaryPanelProps = HTMLAttributes<HTMLElement> & {
  items: BoundaryItem[];
  localMessageLimit?: number;
  title?: string;
  summaryInputs: SummaryInput[];
};

const sideMeta: Record<StorageSide, { label: string; tone: StatusTone; icon: typeof HardDrive }> = {
  LOCAL_ONLY: { icon: HardDrive, label: "로컬 원문", tone: "personal" },
  LOCAL_SUMMARY: { icon: Archive, label: "로컬 요약", tone: "pending" },
  SERVER_APPROVED: { icon: Cloud, label: "승인 후 서버", tone: "approved" },
};

const statusMeta: Record<BoundaryStatus, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: "사용 중", tone: "todo" },
  READY: { label: "확인 대기", tone: "pending" },
  SAVED: { label: "저장됨", tone: "approved" },
};

export const defaultBoundaryItems: BoundaryItem[] = [
  {
    description: "개인 에이전트와 나눈 최근 대화 원문입니다. 서버에 올리지 않고 Tauri SQLite에만 둡니다.",
    label: "최근 대화 원문",
    side: "LOCAL_ONLY",
    status: "ACTIVE",
  },
  {
    description: "오래된 원문을 줄이기 위해 기기 안에서 만든 짧은 맥락 요약입니다.",
    label: "로컬 맥락 요약",
    side: "LOCAL_SUMMARY",
    status: "READY",
  },
  {
    description: "사용자가 확인한 하루정리 결과입니다. 대시보드와 기록 조회를 위해 서버에 저장할 수 있습니다.",
    label: "하루정리 결과",
    side: "SERVER_APPROVED",
    status: "SAVED",
  },
];

export const defaultSummaryInputs: SummaryInput[] = [
  {
    label: "완료 TODO",
    source: "서버 tasks",
    tone: "todo",
    value: "4개",
  },
  {
    label: "총 작업시간",
    source: "서버 time_logs",
    tone: "timer",
    value: "3h 42m",
  },
  {
    label: "버블 사용 집계",
    source: "서버 widget_daily_summaries",
    tone: "agent",
    value: "8회",
  },
  {
    label: "개인 에이전트 요약",
    source: "Tauri SQLite",
    tone: "personal",
    value: "1건",
  },
];

export function PersonalAgentSummaryBoundaryPanel({
  className,
  items,
  localMessageLimit = 100,
  summaryInputs,
  title = "개인 에이전트 저장 경계",
  ...props
}: PersonalAgentSummaryBoundaryPanelProps) {
  const serverSavedCount = items.filter((item) => item.side === "SERVER_APPROVED").length;
  const localOnlyCount = items.filter((item) => item.side !== "SERVER_APPROVED").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<LockKeyhole size={16} strokeWidth={2.1} />}>개인 에이전트</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              개인 에이전트 대화 원문은 기기 안에 둡니다. 하루정리는 서버 원본 데이터와 로컬 요약을 함께 참고하되,
              사용자가 확인한 결과만 서버에 저장합니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>로컬 원문 제한</span>
          <strong>{localMessageLimit}개</strong>
          <StatusBadge tone="personal">기기 안 보관</StatusBadge>
        </div>
      </header>

      <section className={styles.boundaryGrid} aria-label="저장 위치 경계">
        {items.map((item) => {
          const side = sideMeta[item.side];
          const status = statusMeta[item.status];
          const Icon = side.icon;

          return (
            <article key={item.label}>
              <span className={styles.iconTile}>
                <Icon size={18} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div className={styles.boundaryCopy}>
                <div className={styles.boundaryTop}>
                  <strong>{item.label}</strong>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </div>
                <p>{item.description}</p>
                <StatusBadge tone={side.tone}>{side.label}</StatusBadge>
              </div>
            </article>
          );
        })}
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.policyCard} aria-label="저장 정책 요약">
          <div className={styles.sectionTitle}>
            <strong>저장 정책</strong>
            <StatusBadge tone="approved">경계 분리</StatusBadge>
          </div>
          <div className={styles.policyRows}>
            <div>
              <span className={styles.policyIcon}>
                <HardDrive size={16} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <b>로컬 보관</b>
                <p>개인 대화 원문과 상세 맥락은 서버에 남기지 않습니다.</p>
              </div>
              <strong>{localOnlyCount}종</strong>
            </div>
            <div>
              <span className={styles.policyIcon}>
                <Cloud size={16} strokeWidth={2.1} aria-hidden="true" />
              </span>
              <div>
                <b>서버 저장</b>
                <p>사용자가 확인한 하루정리 결과만 서버에서 다시 불러올 수 있습니다.</p>
              </div>
              <strong>{serverSavedCount}종</strong>
            </div>
          </div>
          <ProgressBar value={64} />
          <p className={styles.policyNote}>원문을 무한히 쌓지 않고, 오래된 대화는 로컬 요약 뒤 정리합니다.</p>
        </section>

        <section className={styles.inputCard} aria-label="하루정리 입력값">
          <div className={styles.sectionTitle}>
            <strong>하루정리 입력값</strong>
            <span className={styles.sectionMeta}>원본과 집계 우선</span>
          </div>
          <div className={styles.inputGrid}>
            {summaryInputs.map((input) => (
              <article key={input.label}>
                <span>{input.label}</span>
                <strong>{input.value}</strong>
                <small>{input.source}</small>
                <StatusBadge tone={input.tone}>참고</StatusBadge>
              </article>
            ))}
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.notice}>
          <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />
          <span>개인 원문은 로컬 백업 없이는 복구할 수 없습니다. 확인한 하루정리만 서버에서 복구됩니다.</span>
        </div>
        <div className={styles.actions}>
          <Button icon={<FileClock size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
            로컬 요약 보기
          </Button>
          <Button icon={<CheckCircle2 size={15} strokeWidth={2.1} />} size="sm" variant="primary">
            하루정리 저장
          </Button>
        </div>
      </footer>
    </GlassPanel>
  );
}
