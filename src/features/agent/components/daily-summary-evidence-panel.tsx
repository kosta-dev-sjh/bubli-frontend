import {
  ArchiveRestore,
  Bot,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Database,
  FileCheck2,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./daily-summary-evidence-panel.module.css";

export type DailySummaryStatus = "DRAFT" | "READY_TO_APPROVE" | "APPROVED" | "HELD";

export type DailySummaryEvidence = {
  countLabel: string;
  description: string;
  id: string;
  label: string;
  source: string;
  tone?: StatusTone;
};

type DailySummaryEvidencePanelProps = HTMLAttributes<HTMLElement> & {
  approvedSourceCount?: number;
  dateLabel?: string;
  evidenceItems?: DailySummaryEvidence[];
  localContextLabel?: string;
  onApproveSummary?: () => void;
  onCreateLocalBackup?: () => void;
  onRefreshEvidence?: () => void;
  status?: DailySummaryStatus;
};

const statusCopy: Record<DailySummaryStatus, string> = {
  APPROVED: "승인됨",
  DRAFT: "작성 중",
  HELD: "보류",
  READY_TO_APPROVE: "확인 대기",
};

const statusTone: Record<DailySummaryStatus, StatusTone> = {
  APPROVED: "success",
  DRAFT: "pending",
  HELD: "warning",
  READY_TO_APPROVE: "agent",
};

const defaultEvidenceItems: DailySummaryEvidence[] = [
  {
    countLabel: "완료 6개",
    description: "완료 TODO와 남은 TODO를 오늘 업무 기준으로 정리합니다.",
    id: "tasks",
    label: "TODO",
    source: "서버 TODO",
    tone: "todo",
  },
  {
    countLabel: "3시간 42분",
    description: "총 작업시간은 서버에 저장된 작업 시간 기록 기준으로 계산합니다.",
    id: "time",
    label: "작업 시간",
    source: "서버 작업시간",
    tone: "timer",
  },
  {
    countLabel: "일정 4개",
    description: "오늘 일정과 지나간 마감을 함께 확인합니다.",
    id: "schedule",
    label: "일정",
    source: "서버 일정",
    tone: "room",
  },
  {
    countLabel: "집계 8건",
    description: "기기별 버블 사용 집계를 날짜 기준으로 합산합니다.",
    id: "widget",
    label: "버블 사용 집계",
    source: "버블 사용 집계",
    tone: "personal",
  },
  {
    countLabel: "기기 안 요약 1개",
    description: "개인 에이전트 원문 대신 기기 안 요약 참조만 하루정리에 씁니다.",
    id: "agent",
    label: "개인 에이전트 요약",
    source: "기기 안 개인 에이전트 요약",
    tone: "agent",
  },
];

export function DailySummaryEvidencePanel({
  approvedSourceCount = 4,
  className,
  dateLabel = "2026-06-23",
  evidenceItems = defaultEvidenceItems,
  localContextLabel = "최근 개인 에이전트 원문 100개 기준",
  onApproveSummary,
  onCreateLocalBackup,
  onRefreshEvidence,
  status = "READY_TO_APPROVE",
  ...props
}: DailySummaryEvidencePanelProps) {
  const totalSourceCount = evidenceItems.length;
  const evidencePercent = Math.round((approvedSourceCount / Math.max(totalSourceCount, 1)) * 100);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.mainIcon} aria-hidden="true">
            <Bot size={22} />
          </span>
          <div>
            <StatusBadge tone={statusTone[status]}>{statusCopy[status]}</StatusBadge>
            <h2>하루정리 근거 확인</h2>
            <p>확정된 기록과 기기 안 요약을 모아 후보를 만들고, 사용자가 확인한 요약만 저장합니다.</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<FileCheck2 size={15} />} onClick={onRefreshEvidence} size="sm" variant="quiet">
            근거 다시 보기
          </Button>
          <Button icon={<CheckCircle2 size={15} />} onClick={onApproveSummary} size="sm" variant="primary">
            확인 후 저장
          </Button>
        </div>
      </header>

      <div className={styles.summaryCard}>
        <div>
          <Chip>{dateLabel}</Chip>
          <strong>{approvedSourceCount} / {totalSourceCount}개 근거 준비</strong>
          <span>저장 대상은 사용자가 확인한 요약과 근거 범위입니다.</span>
        </div>
        <ProgressBar label="하루정리 근거 준비율" value={evidencePercent} />
      </div>

      <div className={styles.evidenceGrid} aria-label="하루정리 입력 근거">
        {evidenceItems.map((item) => (
          <EvidenceCard item={item} key={item.id} />
        ))}
      </div>

      <div className={styles.boundaryGrid}>
        <BoundaryItem
          icon={<Database size={17} />}
          label="서버에 남는 값"
          value="사용자가 확인한 하루정리 요약과 근거 범위만 저장합니다."
        />
        <BoundaryItem
          icon={<LockKeyhole size={17} />}
          label="기기 안에만 남는 값"
          value="개인 에이전트 원문과 상세 위젯 이벤트 원문은 기기 안에 둡니다."
        />
        <BoundaryItem
          icon={<ArchiveRestore size={17} />}
          label="복구 기준"
          value="승인된 요약은 서버에서 다시 불러오고, 기기 안 원문은 백업이 없으면 복구하지 못합니다."
        />
      </div>

      <footer className={styles.footer}>
        <div>
          <ShieldCheck size={16} />
          {localContextLabel}
        </div>
        <Button icon={<ArchiveRestore size={14} />} onClick={onCreateLocalBackup} size="sm" variant="ghost">
          기기 안 백업 만들기
        </Button>
      </footer>
    </GlassPanel>
  );
}

function EvidenceCard({ item }: { item: DailySummaryEvidence }) {
  return (
    <article className={styles.evidenceCard}>
      <span aria-hidden="true">{evidenceIcon[item.id] ?? <Database size={17} />}</span>
      <div>
        <div className={styles.cardTop}>
          <StatusBadge tone={item.tone}>{item.label}</StatusBadge>
          <Chip>{item.countLabel}</Chip>
        </div>
        <strong>{item.source}</strong>
        <p>{item.description}</p>
      </div>
    </article>
  );
}

function BoundaryItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className={styles.boundaryItem}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{label}</strong>
        <p>{value}</p>
      </div>
    </article>
  );
}

const evidenceIcon: Record<string, ReactNode> = {
  agent: <MessageSquareText size={17} />,
  schedule: <CalendarCheck2 size={17} />,
  tasks: <ListChecks size={17} />,
  time: <Clock3 size={17} />,
  widget: <Bot size={17} />,
};
