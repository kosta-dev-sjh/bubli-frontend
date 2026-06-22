import {
  Archive,
  CheckCircle2,
  Database,
  HardDrive,
  MessageSquareText,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./personal-agent-memory-panel.module.css";

type MemoryLocation = "LOCAL_ONLY" | "LOCAL_SUMMARY" | "SERVER_APPROVED";
type MemoryStatus = "ACTIVE" | "ROLLUP_READY" | "APPROVED" | "BACKUP_READY";

type MemoryItem = {
  description: string;
  label: string;
  location: MemoryLocation;
  status: MemoryStatus;
};

type MemoryRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type PersonalAgentMemoryPanelProps = HTMLAttributes<HTMLElement> & {
  dailySummaryTitle: string;
  memoryItems: MemoryItem[];
  messageLimit: number;
  rules: MemoryRule[];
  usedMessageCount: number;
  title?: string;
};

const locationMeta: Record<MemoryLocation, { label: string; tone: StatusTone }> = {
  LOCAL_ONLY: { label: "로컬 원문", tone: "personal" },
  LOCAL_SUMMARY: { label: "로컬 요약", tone: "agent" },
  SERVER_APPROVED: { label: "승인 후 서버", tone: "approved" },
};

const statusMeta: Record<MemoryStatus, { actionLabel: string; label: string; tone: StatusTone }> = {
  ACTIVE: { actionLabel: "보기", label: "단기기억", tone: "personal" },
  APPROVED: { actionLabel: "열기", label: "승인됨", tone: "approved" },
  BACKUP_READY: { actionLabel: "백업", label: "백업 가능", tone: "room" },
  ROLLUP_READY: { actionLabel: "정리", label: "요약 대기", tone: "agent" },
};

export const defaultPersonalAgentMemoryItems: MemoryItem[] = [
  {
    description: "개인 에이전트 원문 대화는 Tauri SQLite에 최근 대화 중심으로 남깁니다.",
    label: "local_agent_messages",
    location: "LOCAL_ONLY",
    status: "ACTIVE",
  },
  {
    description: "오래된 원문은 로컬 요약으로 줄이고, 상세 원문을 서버로 보내지 않습니다.",
    label: "local_agent_summaries",
    location: "LOCAL_SUMMARY",
    status: "ROLLUP_READY",
  },
  {
    description: "사용자가 확인한 하루정리 결과만 daily_summaries에 저장할 수 있습니다.",
    label: "daily_summaries",
    location: "SERVER_APPROVED",
    status: "APPROVED",
  },
  {
    description: "개인 로컬 데이터는 암호화된 기기 안 백업 목록으로 관리합니다.",
    label: "local_backup_manifest",
    location: "LOCAL_ONLY",
    status: "BACKUP_READY",
  },
];

export const defaultPersonalAgentMemoryRules: MemoryRule[] = [
  {
    description: "개인 에이전트 원문은 서버 DB에 저장하지 않고 Tauri SQLite에 둡니다.",
    label: "원문 로컬 보관",
    tone: "personal",
  },
  {
    description: "최근 대화가 기준을 넘으면 로컬 요약이나 삭제 후보로 넘겨 단기기억 크기를 관리합니다.",
    label: "단기기억 제한",
    tone: "agent",
  },
  {
    description: "하루정리는 사용자가 확인한 결과만 서버에 저장하며, 로컬 원문 복구와 구분합니다.",
    label: "승인 요약 저장",
    tone: "approved",
  },
];

export function PersonalAgentMemoryPanel({
  className,
  dailySummaryTitle,
  memoryItems,
  messageLimit,
  rules,
  title = "개인 에이전트 기억 기준",
  usedMessageCount,
  ...props
}: PersonalAgentMemoryPanelProps) {
  const usagePercent = Math.round((usedMessageCount / messageLimit) * 100);
  const localOnlyCount = memoryItems.filter((item) => item.location === "LOCAL_ONLY").length;
  const serverApprovedCount = memoryItems.filter((item) => item.location === "SERVER_APPROVED").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Sparkles size={16} strokeWidth={2.1} />}>local_agent_messages</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              개인 에이전트 대화 원문은 서버 채팅 기록과 분리합니다. 최근 원문은 기기 안에 두고, 사용자가 확인한
              하루정리만 서버 요약으로 남깁니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>하루정리 후보</span>
          <strong>{dailySummaryTitle}</strong>
          <StatusBadge tone="personal">개인 영역</StatusBadge>
        </div>
      </header>

      <section className={styles.memoryGrid} aria-label="개인 에이전트 기억 저장 위치">
        <article className={styles.memoryCard}>
          <span className={styles.iconTile}>
            <HardDrive size={19} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <StatusBadge tone="personal">Tauri SQLite</StatusBadge>
            <h3>최근 원문 대화</h3>
            <p>개인 에이전트의 원문 단기기억은 기기 안에서만 유지합니다.</p>
          </div>
        </article>

        <article className={styles.centerCard}>
          <span className={styles.iconTile}>
            <MessageSquareText size={20} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <Chip selected>
            {usedMessageCount}/{messageLimit}개
          </Chip>
          <h3>단기기억 사용량</h3>
          <p>기준을 넘기기 전에 로컬 요약이나 정리 후보로 넘깁니다.</p>
          <ProgressBar label="개인 에이전트 단기기억 사용량" value={usagePercent} />
          <Button size="sm" variant="secondary">
            하루정리 확인
          </Button>
        </article>

        <article className={styles.memoryCard}>
          <span className={styles.iconTile}>
            <Server size={19} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <StatusBadge tone="approved">서버 DB</StatusBadge>
            <h3>승인된 요약</h3>
            <p>사용자가 확인한 하루정리 결과만 서버에서 다시 조회할 수 있습니다.</p>
          </div>
        </article>
      </section>

      <section className={styles.metrics} aria-label="개인 에이전트 기억 요약">
        <article>
          <span>로컬 항목</span>
          <strong>{localOnlyCount}</strong>
          <StatusBadge tone="personal">기기 안</StatusBadge>
        </article>
        <article>
          <span>서버 요약</span>
          <strong>{serverApprovedCount}</strong>
          <StatusBadge tone="approved">승인 후</StatusBadge>
        </article>
        <article>
          <span>원문 복구</span>
          <strong>백업</strong>
          <StatusBadge tone="room">로컬 기준</StatusBadge>
        </article>
      </section>

      <section className={styles.itemList} aria-label="개인 에이전트 기억 항목">
        {memoryItems.map((item) => {
          const location = locationMeta[item.location];
          const status = statusMeta[item.status];

          return (
            <article className={styles.itemCard} key={item.label}>
              <span className={styles.iconTile}>
                {item.location === "SERVER_APPROVED" ? (
                  <ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />
                ) : item.status === "BACKUP_READY" ? (
                  <Archive size={18} strokeWidth={2.1} aria-hidden="true" />
                ) : (
                  <Database size={18} strokeWidth={2.1} aria-hidden="true" />
                )}
              </span>
              <div className={styles.itemMain}>
                <strong>{item.label}</strong>
                <p>{item.description}</p>
              </div>
              <StatusBadge tone={location.tone}>{location.label}</StatusBadge>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              <Button size="sm" variant={item.status === "ROLLUP_READY" ? "secondary" : "quiet"}>
                {status.actionLabel}
              </Button>
            </article>
          );
        })}
      </section>

      <section className={styles.ruleGrid} aria-label="개인 에이전트 기억 정책">
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
