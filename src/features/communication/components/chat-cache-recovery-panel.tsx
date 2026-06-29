import { CheckCircle2, Database, HardDriveDownload, MessageSquareText, RefreshCw, Server, ShieldCheck, Wifi } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type CacheStatus = "valid" | "stale" | "rebuilding" | "corrupted";

export type ChatCacheStep = {
  description: string;
  label: string;
  state: CacheStatus;
};

export type ChatCacheRecoveryPanelProps = HTMLAttributes<HTMLElement> & {
  cacheStatus: CacheStatus;
  cachedCount: number;
  lastRoomSequence: number;
  roomLabel: string;
  serverSequence: number;
  steps: ChatCacheStep[];
  title?: string;
};

const statusMeta: Record<CacheStatus, { icon: ReactNode; label: string; tone: StatusTone }> = {
  valid: {
    icon: <CheckCircle2 size={16} strokeWidth={2.1} />,
    label: "정상",
    tone: "success",
  },
  stale: {
    icon: <RefreshCw size={16} strokeWidth={2.1} />,
    label: "보충 필요",
    tone: "pending",
  },
  rebuilding: {
    icon: <HardDriveDownload size={16} strokeWidth={2.1} />,
    label: "재생성 중",
    tone: "todo",
  },
  corrupted: {
    icon: <ShieldCheck size={16} strokeWidth={2.1} />,
    label: "복구 필요",
    tone: "warning",
  },
};

export function ChatCacheRecoveryPanel({
  cacheStatus,
  cachedCount,
  className,
  lastRoomSequence,
  roomLabel,
  serverSequence,
  steps,
  title = "프로젝트룸 채팅 캐시 복구",
  ...props
}: ChatCacheRecoveryPanelProps) {
  const status = statusMeta[cacheStatus];
  const syncPercent = serverSequence > 0 ? Math.min(100, Math.round((lastRoomSequence / serverSequence) * 100)) : 0;
  const missingCount = Math.max(0, serverSequence - lastRoomSequence);

  return (
    <GlassPanel as="section" className={cn("grid gap-5", className)} {...props}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <Chip icon={<MessageSquareText size={14} strokeWidth={2.1} />} selected>
            프로젝트룸 채팅
          </Chip>
          <div className="grid gap-1">
            <h2 className="m-0 text-[22px] font-[860] leading-tight text-[var(--color-text)]">{title}</h2>
            <p className="m-0 max-w-[720px] text-[14px] leading-6 text-[var(--color-muted)]">
              서버 채팅 메시지가 원본입니다. 기기 안 캐시는 최근 메시지를 빠르게 보여주기 위한 기기별 복제본입니다.
            </p>
          </div>
        </div>
        <StatusBadge tone={status.tone}>
          <span className="inline-flex items-center gap-1">
            {status.icon}
            {status.label}
          </span>
        </StatusBadge>
      </header>

      <section className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-white/70 p-4 shadow-[var(--shadow-soft)] md:grid-cols-[1fr_1fr]">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-[14px] font-[820] text-[var(--color-text)]">{roomLabel}</p>
              <p className="m-0 text-[12.5px] text-[var(--color-muted)]">
                기기 안 최근 메시지 {cachedCount}개 · 빠진 메시지 {missingCount}개
              </p>
            </div>
            <Chip icon={<Wifi size={14} strokeWidth={2.1} />}>실시간 보충</Chip>
          </div>
          <ProgressBar label="채팅 캐시 동기화율" value={syncPercent} />
        </div>

        <div className="grid gap-2 rounded-[var(--radius-input)] bg-[rgba(215,234,244,0.42)] p-3">
          <div className="flex items-center gap-2 text-[12.5px] font-[820] text-[var(--color-blue-deep)]">
            <Server size={15} strokeWidth={2.1} />
            동기화 기준
          </div>
          <p className="m-0 text-[13px] leading-5 text-[var(--color-muted)]">
            서버에는 {serverSequence}번 메시지까지 있고, 이 기기는 {lastRoomSequence}번까지 보관했습니다. 부족한 구간만 다시 요청합니다.
          </p>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {steps.map((step) => {
          const stepStatus = statusMeta[step.state];

          return (
            <article
              className="rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-white/70 p-4 shadow-[var(--shadow-soft)]"
              key={step.label}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="bubli-icon-tile" aria-hidden="true">
                  {stepStatus.icon}
                </span>
                <StatusBadge tone={stepStatus.tone}>{stepStatus.label}</StatusBadge>
              </div>
              <h3 className="m-0 text-[15px] font-[840] leading-tight text-[var(--color-text)]">{step.label}</h3>
              <p className="m-0 mt-2 text-[13px] leading-5 text-[var(--color-muted)]">{step.description}</p>
            </article>
          );
        })}
      </div>

      <footer className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-[rgba(255,255,255,0.62)] p-4 md:grid-cols-2">
        <div className="flex items-start gap-3">
          <span className="bubli-icon-tile" aria-hidden="true">
            <Database size={18} strokeWidth={2.1} />
          </span>
          <p className="m-0 text-[13px] leading-5 text-[var(--color-muted)]">
            웹은 서버에서 최근 메시지를 읽고 실시간 연결로 새 메시지를 받습니다. 새로고침해도 서버 원본을 다시 불러옵니다.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="bubli-icon-tile" aria-hidden="true">
            <HardDriveDownload size={18} strokeWidth={2.1} />
          </span>
          <p className="m-0 text-[13px] leading-5 text-[var(--color-muted)]">
            기기 안 최근 메시지가 비었거나 손상되면 서버에서 최근 100개 메시지를 다시 내려받아 복구합니다.
          </p>
        </div>
      </footer>
    </GlassPanel>
  );
}
