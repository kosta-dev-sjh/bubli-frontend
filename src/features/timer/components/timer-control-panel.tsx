"use client";

import {
  CalendarClock,
  Clock3,
  HeartPulse,
  Pause,
  Play,
  RotateCcw,
  Square,
  TimerReset,
  WifiOff,
} from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./timer-control-panel.module.css";

export type TimerControlStatus = "IDLE" | "RUNNING" | "PAUSED" | "SYNC_WAITING" | "RECOVERY_NEEDED";

export type TimerControlState = {
  elapsedLabel: string;
  heartbeatLabel: string;
  id: string;
  projectRoomLabel?: string;
  status: TimerControlStatus;
  taskLabel: string;
  todayTotalLabel: string;
  unsentEventCount: number;
};

export type TimerControlPanelProps = HTMLAttributes<HTMLElement> & {
  onPause?: (timerId: string) => void;
  onResume?: (timerId: string) => void;
  onStart?: (timerId: string) => void;
  onStop?: (timerId: string) => void;
  state?: TimerControlState;
};

const statusMeta: Record<TimerControlStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  IDLE: { labelKey: "timer.status.idle", tone: "neutral" },
  PAUSED: { labelKey: "timer.status.paused", tone: "pending" },
  RECOVERY_NEEDED: { labelKey: "timer.status.recoveryNeeded", tone: "warning" },
  RUNNING: { labelKey: "timer.status.running", tone: "timer" },
  SYNC_WAITING: { labelKey: "timer.status.syncWaiting", tone: "pending" },
};

export const defaultTimerControlState: TimerControlState = {
  elapsedLabel: "25:00",
  heartbeatLabel: "마지막 신호 18초 전",
  id: "timer-current-focus",
  projectRoomLabel: "신규 웹사이트 번역",
  status: "RUNNING",
  taskLabel: "1차 번역본 검토",
  todayTotalLabel: "03:42",
  unsentEventCount: 1,
};

export function TimerControlPanel({
  className,
  onPause,
  onResume,
  onStart,
  onStop,
  state = defaultTimerControlState,
  ...props
}: TimerControlPanelProps) {
  const { t } = useI18n();
  const status = statusMeta[state.status];
  const canStart = state.status === "IDLE" || state.status === "RECOVERY_NEEDED";
  const canPause = state.status === "RUNNING" || state.status === "SYNC_WAITING";
  const canResume = state.status === "PAUSED";
  const heartbeatPercent = state.status === "RECOVERY_NEEDED" ? 100 : 36;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<TimerReset size={15} strokeWidth={2.1} />}>{t("timer.control.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{t("timer.control.title")}</h2>
            <p className={styles.description}>{t("timer.control.description")}</p>
          </div>
        </div>
        <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
      </header>

      <section className={styles.timerFace} aria-label={t("timer.control.currentAria")}>
        <div className={styles.timerMeta}>
          <span>{state.projectRoomLabel ?? t("timer.control.personalWork")}</span>
          <StatusBadge tone={status.tone}>{state.heartbeatLabel}</StatusBadge>
        </div>
        <strong>{state.elapsedLabel}</strong>
        <p>{state.taskLabel}</p>
      </section>

      <div className={styles.controlRow} aria-label={t("timer.control.controlAria")}>
        <Button disabled={!canStart} icon={<Play size={15} strokeWidth={2.1} />} onClick={() => onStart?.(state.id)} variant="primary">
          {t("timer.control.start")}
        </Button>
        <Button disabled={!canPause} icon={<Pause size={15} strokeWidth={2.1} />} onClick={() => onPause?.(state.id)} variant="secondary">
          {t("timer.control.pause")}
        </Button>
        <Button disabled={!canResume} icon={<RotateCcw size={15} strokeWidth={2.1} />} onClick={() => onResume?.(state.id)} variant="secondary">
          {t("timer.control.resume")}
        </Button>
        <Button icon={<Square size={15} strokeWidth={2.1} />} onClick={() => onStop?.(state.id)} variant="quiet">
          {t("timer.control.stop")}
        </Button>
      </div>

      <section className={styles.infoGrid} aria-label={t("timer.control.summaryAria")}>
        <article>
          <Clock3 size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("timer.control.todayTotal")}</span>
          <strong>{state.todayTotalLabel}</strong>
          <p>{t("timer.control.todayTotalDesc")}</p>
        </article>
        <article>
          <HeartPulse size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>heartbeat</span>
          <strong>{t("timer.control.heartbeatValue")}</strong>
          <p>{t("timer.control.heartbeatDesc")}</p>
        </article>
        <article>
          <WifiOff size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("timer.control.unsent")}</span>
          <strong>{t("timer.control.unsentCount", { count: state.unsentEventCount })}</strong>
          <p>{t("timer.control.unsentDesc")}</p>
        </article>
        <article>
          <CalendarClock size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>{t("timer.control.location")}</span>
          <strong>{t("timer.control.locationValue")}</strong>
          <p>{t("timer.control.locationDesc")}</p>
        </article>
      </section>

      <section className={styles.syncBox} aria-label={t("timer.control.syncAria")}>
        <div>
          <span>{t("timer.control.recoveryStandard")}</span>
          <strong>{t("timer.control.recoveryStandardValue")}</strong>
        </div>
        <ProgressBar value={heartbeatPercent} />
        <p>{t("timer.control.syncNote")}</p>
      </section>
    </GlassPanel>
  );
}
