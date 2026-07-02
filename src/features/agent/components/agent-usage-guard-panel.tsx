"use client";

import { Gauge, History, Layers3, RefreshCcw, ShieldCheck, Sparkles, TimerReset } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
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
  resultLabel: string;
  reviewRuleLabel: string;
  strategyLabel: string;
  usageLabel: string;
};

export type AgentUsageGuardPanelProps = HTMLAttributes<HTMLElement> & {
  cacheHitLabel: string;
  dailyLimit: number;
  guards: AgentUsageGuard[];
  modelCalls: AgentModelCallSummary[];
  title?: string;
  usedToday: number;
};

const statusMeta: Record<GuardStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  ready: {
    labelKey: "agent.guard.statusReady",
    tone: "success",
  },
  watch: {
    labelKey: "agent.guard.statusWatch",
    tone: "pending",
  },
  blocked: {
    labelKey: "agent.guard.statusBlocked",
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
  title,
  usedToday,
  ...props
}: AgentUsageGuardPanelProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("agent.guard.defaultTitle");
  const usagePercent = dailyLimit > 0 ? Math.min(100, Math.round((usedToday / dailyLimit) * 100)) : 0;
  const remainingCount = Math.max(0, dailyLimit - usedToday);

  return (
    <GlassPanel as="section" className={cn("grid gap-5", className)} {...props}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <Chip icon={<Sparkles size={14} strokeWidth={2.1} />} selected>
            {t("agent.guard.chip")}
          </Chip>
          <div className="grid gap-1">
            <h2 className="m-0 text-[22px] font-[860] leading-tight text-[var(--color-text)]">{resolvedTitle}</h2>
            <p className="m-0 max-w-[680px] text-[14px] leading-6 text-[var(--color-muted)]">
              {t("agent.guard.desc")}
            </p>
          </div>
        </div>
        <StatusBadge tone={usagePercent >= 90 ? "warning" : "success"}>{t("agent.guard.remaining", { count: remainingCount })}</StatusBadge>
      </header>

      <section className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-white/70 p-4 shadow-[var(--shadow-soft)] md:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-[14px] font-[820] text-[var(--color-text)]">{t("agent.guard.todayUsage")}</p>
              <p className="m-0 text-[12.5px] text-[var(--color-muted)]">
                {t("agent.guard.usageMeta", { limit: dailyLimit, used: usedToday })}
              </p>
            </div>
            <Chip icon={<RefreshCcw size={14} strokeWidth={2.1} />}>{cacheHitLabel}</Chip>
          </div>
          <ProgressBar label={t("agent.guard.usageBar")} value={usagePercent} />
        </div>
        <div className="grid gap-2 rounded-[var(--radius-input)] bg-[rgba(215,234,244,0.42)] p-3">
          <div className="flex items-center gap-2 text-[12.5px] font-[820] text-[var(--color-blue-deep)]">
            <Layers3 size={15} strokeWidth={2.1} />
            {t("agent.guard.dedup")}
          </div>
          <p className="m-0 text-[13px] leading-5 text-[var(--color-muted)]">
            {t("agent.guard.dedupDesc")}
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
                <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
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
          <h3 className="m-0 text-[15px] font-[840] text-[var(--color-text)]">{t("agent.guard.recentRecords")}</h3>
          <Chip icon={<History size={14} strokeWidth={2.1} />}>{t("agent.guard.recordBoth")}</Chip>
        </div>
        <ul className="m-0 grid list-none gap-2 p-0">
          {modelCalls.map((call) => (
            <li
              className="grid gap-2 rounded-[var(--radius-input)] border border-[var(--glass-border)] bg-white/60 p-3 md:grid-cols-[1fr_auto]"
              key={`${call.strategyLabel}-${call.reviewRuleLabel}-${call.resultLabel}-${call.latencyLabel}`}
            >
              <div className="min-w-0">
                <p className="m-0 text-[13.5px] font-[820] text-[var(--color-text)]">{call.strategyLabel}</p>
                <p className="m-0 mt-1 text-[12.5px] text-[var(--color-muted)]">
                  {t("agent.guard.callMeta", { result: call.resultLabel, reviewRule: call.reviewRuleLabel })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <Chip>{call.usageLabel}</Chip>
                <Chip>{call.latencyLabel}</Chip>
                {call.errorCode ? <StatusBadge tone="warning">{call.errorCode}</StatusBadge> : <StatusBadge tone="success">{t("agent.guard.success")}</StatusBadge>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </GlassPanel>
  );
}
