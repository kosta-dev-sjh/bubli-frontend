import { Gauge, History, Layers3, RefreshCcw, ShieldCheck, Sparkles, TimerReset } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type GuardStatus = "ready" | "watch" | "blocked";

export type AgentUsageGuard = {
  description: string;
  label: string;
  status: GuardStatus;
  value: string;
};

export type AgentModelCallSummary = {
  errorCode?: string;
  latencyLabel: string;
  modelName: string;
  promptVersion: string;
  schemaVersion: string;
  tokenLabel: string;
};

export type AgentUsageGuardPanelProps = HTMLAttributes<HTMLElement> & {
  cacheHitLabel: string;
  dailyLimit: number;
  guards: AgentUsageGuard[];
  modelCalls: AgentModelCallSummary[];
  title?: string;
  usedToday: number;
};

const statusMeta: Record<GuardStatus, { label: string; tone: StatusTone }> = {
  ready: {
    label: "정상",
    tone: "success",
  },
  watch: {
    label: "주의",
    tone: "pending",
  },
  blocked: {
    label: "차단",
    tone: "warning",
  },
};

const guardIcon: Record<GuardStatus, ReactNode> = {
  ready: <ShieldCheck size={17} strokeWidth={2.1} />,
  watch: <Gauge size={17} strokeWidth={2.1} />,
  blocked: <TimerReset size={17} strokeWidth={2.1} />,
};

export function AgentUsageGuardPanel({
  cacheHitLabel,
  className,
  dailyLimit,
  guards,
  modelCalls,
  title = "에이전트 사용량 가드",
  usedToday,
  ...props
}: AgentUsageGuardPanelProps) {
  const usagePercent = dailyLimit > 0 ? Math.min(100, Math.round((usedToday / dailyLimit) * 100)) : 0;
  const remainingCount = Math.max(0, dailyLimit - usedToday);

  return (
    <GlassPanel as="section" className={cn("grid gap-5", className)} {...props}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <Chip icon={<Sparkles size={14} strokeWidth={2.1} />} selected>
            에이전트
          </Chip>
          <div className="grid gap-1">
            <h2 className="m-0 text-[22px] font-[860] leading-tight text-[var(--color-text)]">{title}</h2>
            <p className="m-0 max-w-[680px] text-[14px] leading-6 text-[var(--color-muted)]">
              에이전트 정리는 사용자별 제한과 분석 캐시를 먼저 확인합니다. 처리 결과는 기록으로 남기고, 사용자는 후보만 검토합니다.
            </p>
          </div>
        </div>
        <StatusBadge tone={usagePercent >= 90 ? "warning" : "success"}>오늘 남은 정리 {remainingCount}회</StatusBadge>
      </header>

      <section className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-white/70 p-4 shadow-[var(--shadow-soft)] md:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-[14px] font-[820] text-[var(--color-text)]">오늘 에이전트 정리</p>
              <p className="m-0 text-[12.5px] text-[var(--color-muted)]">
                {usedToday}회 사용 · 하루 기준 {dailyLimit}회
              </p>
            </div>
            <Chip icon={<RefreshCcw size={14} strokeWidth={2.1} />}>{cacheHitLabel}</Chip>
          </div>
          <ProgressBar label="오늘 에이전트 정리 사용량" value={usagePercent} />
        </div>
        <div className="grid gap-2 rounded-[var(--radius-input)] bg-[rgba(215,234,244,0.42)] p-3">
          <div className="flex items-center gap-2 text-[12.5px] font-[820] text-[var(--color-blue-deep)]">
            <Layers3 size={15} strokeWidth={2.1} />
            반복 분석 방지
          </div>
          <p className="m-0 text-[13px] leading-5 text-[var(--color-muted)]">
            같은 파일 해시가 있으면 캐시 결과를 먼저 사용합니다. 분석 결과가 없거나 만료된 경우에만 새 작업을 만듭니다.
          </p>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {guards.map((guard) => {
          const status = statusMeta[guard.status];

          return (
            <article
              className="rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-white/70 p-4 shadow-[var(--shadow-soft)]"
              key={guard.label}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="bubli-icon-tile" aria-hidden="true">
                  {guardIcon[guard.status]}
                </span>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>
              <p className="m-0 text-[13px] font-[820] text-[var(--color-muted)]">{guard.label}</p>
              <p className="m-0 mt-1 text-[20px] font-[860] leading-tight text-[var(--color-text)]">{guard.value}</p>
              <p className="m-0 mt-2 text-[13px] leading-5 text-[var(--color-muted)]">{guard.description}</p>
            </article>
          );
        })}
      </div>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="m-0 text-[15px] font-[840] text-[var(--color-text)]">최근 에이전트 정리 기록</h3>
          <Chip icon={<History size={14} strokeWidth={2.1} />}>성공과 실패 모두 기록</Chip>
        </div>
        <ul className="m-0 grid list-none gap-2 p-0">
          {modelCalls.map((call) => (
            <li
              className="grid gap-2 rounded-[var(--radius-input)] border border-[var(--glass-border)] bg-white/60 p-3 md:grid-cols-[1fr_auto]"
              key={`${call.modelName}-${call.promptVersion}-${call.schemaVersion}-${call.latencyLabel}`}
            >
              <div className="min-w-0">
                <p className="m-0 text-[13.5px] font-[820] text-[var(--color-text)]">{call.modelName}</p>
                <p className="m-0 mt-1 text-[12.5px] text-[var(--color-muted)]">
                  질문 방식 {call.promptVersion} · 결과 형식 {call.schemaVersion}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <Chip>{call.tokenLabel}</Chip>
                <Chip>{call.latencyLabel}</Chip>
                {call.errorCode ? <StatusBadge tone="warning">{call.errorCode}</StatusBadge> : <StatusBadge tone="success">성공</StatusBadge>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </GlassPanel>
  );
}
