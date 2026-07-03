"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Play,
  RefreshCcw,
  Server,
  ShieldCheck,
  TimerReset,
  Wifi,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./timer-recovery-panel.module.css";

export type TimerRecoveryStatus = "RUNNING" | "PAUSED" | "STOPPED" | "RECOVERY_NEEDED" | "RECOVERED";

export type TimerRecoveryMetric = {
  description: string;
  id: string;
  label: string;
  tone?: StatusTone;
  value: string;
};

export type TimerRecoveryEvent = {
  detail: string;
  id: string;
  label: string;
  tone?: StatusTone;
};

type TimerRecoveryPanelProps = HTMLAttributes<HTMLElement> & {
  heartbeatAgeSeconds?: number;
  heartbeatIntervalSeconds?: number;
  modeLabel?: string;
  onConfirmStop?: () => void;
  onRecoverTimer?: () => void;
  onResendOutbox?: () => void;
  onSendHeartbeat?: () => void;
  projectLabel?: string;
  recoveryThresholdSeconds?: number;
  serverStatusLabel?: string;
  status?: TimerRecoveryStatus;
  taskLabel?: string;
  timeLabel?: string;
  unsentEventCount?: number;
};

const statusCopy: Record<TimerRecoveryStatus, MessageKey> = {
  RUNNING: "timer.status.running",
  PAUSED: "timer.status.paused",
  STOPPED: "timer.status.stoppedDone",
  RECOVERY_NEEDED: "timer.status.recoveryNeededFull",
  RECOVERED: "timer.status.recovered",
};

const statusTone: Record<TimerRecoveryStatus, StatusTone> = {
  RUNNING: "timer",
  PAUSED: "pending",
  STOPPED: "neutral",
  RECOVERY_NEEDED: "warning",
  RECOVERED: "success",
};

type TranslateFn = (key: MessageKey, vars?: Record<string, string | number>) => string;

function buildDefaultMetrics(t: TranslateFn): TimerRecoveryMetric[] {
  return [
    {
      description: t("timer.recovery.metric.server.desc"),
      id: "server",
      label: t("timer.recovery.metric.server.label"),
      tone: "room",
      value: t("timer.recovery.metric.server.value"),
    },
    {
      description: t("timer.recovery.metric.localState.desc"),
      id: "local-state",
      label: t("timer.recovery.metric.localState.label"),
      tone: "personal",
      value: t("timer.recovery.metric.localState.value"),
    },
    {
      description: t("timer.recovery.metric.outbox.desc"),
      id: "outbox",
      label: t("timer.recovery.metric.outbox.label"),
      tone: "pending",
      value: t("timer.recovery.metric.outbox.value"),
    },
  ];
}

export function TimerRecoveryPanel({
  className,
  heartbeatAgeSeconds = 42,
  heartbeatIntervalSeconds = 60,
  modeLabel,
  onConfirmStop,
  onRecoverTimer,
  onResendOutbox,
  onSendHeartbeat,
  projectLabel,
  recoveryThresholdSeconds = 90,
  serverStatusLabel,
  status = "RUNNING",
  taskLabel,
  timeLabel = "42:18",
  unsentEventCount = 2,
  ...props
}: TimerRecoveryPanelProps) {
  const { t } = useI18n();
  const resolvedModeLabel = modeLabel ?? t("timer.recovery.modeLabel");
  const resolvedProjectLabel = projectLabel ?? t("timer.recovery.defaultProject");
  const resolvedServerStatusLabel = serverStatusLabel ?? t("timer.recovery.defaultServerStatus");
  const resolvedTaskLabel = taskLabel ?? t("timer.recovery.defaultTask");
  const heartbeatPercent = Math.min(100, Math.round((heartbeatAgeSeconds / recoveryThresholdSeconds) * 100));
  const isRecoveryNeeded = status === "RECOVERY_NEEDED";
  const defaultMetrics = buildDefaultMetrics(t);
  const events: TimerRecoveryEvent[] = [
    {
      detail: t("timer.recovery.event.heartbeat.detail", { seconds: heartbeatIntervalSeconds }),
      id: "heartbeat",
      label: t("timer.recovery.event.heartbeat.label"),
      tone: "timer",
    },
    {
      detail: t("timer.recovery.event.threshold.detail", { seconds: recoveryThresholdSeconds }),
      id: "threshold",
      label: t("timer.recovery.event.threshold.label"),
      tone: isRecoveryNeeded ? "warning" : "success",
    },
    {
      detail: t("timer.recovery.event.queue.detail", { count: unsentEventCount }),
      id: "outbox",
      label: t("timer.recovery.event.queue.label"),
      tone: unsentEventCount > 0 ? "pending" : "success",
    },
  ];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.mainIcon} aria-hidden="true">
            <TimerReset size={22} />
          </span>
          <div>
            <StatusBadge tone={statusTone[status]}>{t(statusCopy[status])}</StatusBadge>
            <h2>{t("timer.recovery.title")}</h2>
            <p>{t("timer.recovery.description")}</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<Wifi size={15} />} onClick={onSendHeartbeat} size="sm" variant="quiet">
            {t("timer.recovery.sendHeartbeat")}
          </Button>
          <Button icon={<RefreshCcw size={15} />} onClick={onResendOutbox} size="sm" variant="primary">
            {t("timer.recovery.resendQueue")}
          </Button>
        </div>
      </header>

      <div className={styles.timerGrid}>
        <article className={styles.timerFace} aria-label={t("timer.recovery.currentAria")}>
          <div className={styles.timerMeta}>
            <Chip>{resolvedModeLabel}</Chip>
            <StatusBadge tone={statusTone[status]}>{resolvedServerStatusLabel}</StatusBadge>
          </div>
          <strong>{timeLabel}</strong>
          <p>{resolvedTaskLabel}</p>
          <span>{resolvedProjectLabel}</span>
        </article>

        <article className={styles.heartbeatCard}>
          <div className={styles.heartbeatHeader}>
            <span aria-hidden="true">
              <Clock3 size={18} />
            </span>
            <div>
              <strong>{t("timer.recovery.heartbeatAge", { seconds: heartbeatAgeSeconds })}</strong>
              <p>{t("timer.recovery.heartbeatAgeDesc")}</p>
            </div>
          </div>
          <ProgressBar label={t("timer.recovery.heartbeatBar")} value={heartbeatPercent} />
          <p>{t("timer.recovery.calcNote")}</p>
        </article>
      </div>

      <div className={styles.metricGrid} aria-label={t("timer.recovery.storeAria")}>
        {defaultMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className={styles.recoveryBox} data-state={isRecoveryNeeded ? "warning" : "stable"}>
        <div className={styles.recoveryCopy}>
          <span aria-hidden="true">{isRecoveryNeeded ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}</span>
          <div>
            <strong>{isRecoveryNeeded ? t("timer.recovery.needCheck") : t("timer.recovery.linked")}</strong>
            <p>{t("timer.recovery.conflictNote")}</p>
          </div>
        </div>
        <div className={styles.recoveryActions}>
          <Button icon={<Play size={15} />} onClick={onRecoverTimer} size="sm" variant="primary">
            {t("timer.recovery.continue")}
          </Button>
          <Button icon={<CheckCircle2 size={15} />} onClick={onConfirmStop} size="sm" variant="quiet">
            {t("timer.recovery.stopFromLast")}
          </Button>
        </div>
      </div>

      <div className={styles.eventList} aria-label={t("timer.recovery.eventAria")}>
        {events.map((event) => (
          <div className={styles.eventItem} key={event.id}>
            <StatusBadge tone={event.tone}>{event.label}</StatusBadge>
            <span>{event.detail}</span>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

function MetricCard({ metric }: { metric: TimerRecoveryMetric }) {
  return (
    <article className={styles.metricCard}>
      <span aria-hidden="true">{metricIcon[metric.id] ?? <Database size={17} />}</span>
      <div>
        <StatusBadge tone={metric.tone}>{metric.label}</StatusBadge>
        <strong>{metric.value}</strong>
        <p>{metric.description}</p>
      </div>
    </article>
  );
}

const metricIcon: Record<string, ReactNode> = {
  outbox: <RefreshCcw size={17} />,
  server: <Server size={17} />,
  "local-state": <Database size={17} />,
};
