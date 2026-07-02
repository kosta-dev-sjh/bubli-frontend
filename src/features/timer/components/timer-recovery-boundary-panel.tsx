"use client";

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Database,
  HeartPulse,
  RotateCw,
  Server,
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

import styles from "./timer-recovery-boundary-panel.module.css";

type TimerRunStatus = "RUNNING" | "PAUSED" | "RECOVERY_NEEDED" | "STOPPED";
type SyncItemStatus = "SENT" | "WAITING" | "RETRYING";

type TimerRecoveryState = {
  heartbeatLabel: string;
  localStateLabel: string;
  serverTimeLabel: string;
  status: TimerRunStatus;
  taskTitle: string;
};

type SyncItem = {
  description: string;
  label: string;
  status: SyncItemStatus;
};

type TimerRule = {
  description: string;
  label: string;
  tone: StatusTone;
};

export type TimerRecoveryBoundaryPanelProps = HTMLAttributes<HTMLElement> & {
  recoveryState: TimerRecoveryState;
  recoveryPercent: number;
  rules: TimerRule[];
  syncItems: SyncItem[];
  title?: string;
};

const runStatusMeta: Record<TimerRunStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  PAUSED: { labelKey: "timer.status.paused", tone: "pending" },
  RECOVERY_NEEDED: { labelKey: "timer.status.recoveryNeeded", tone: "warning" },
  RUNNING: { labelKey: "timer.status.running", tone: "timer" },
  STOPPED: { labelKey: "timer.status.stopped", tone: "approved" },
};

const syncStatusMeta: Record<SyncItemStatus, { labelKey: MessageKey; tone: StatusTone }> = {
  RETRYING: { labelKey: "timer.sync.retrying", tone: "warning" },
  SENT: { labelKey: "timer.sync.sent", tone: "approved" },
  WAITING: { labelKey: "timer.sync.waiting", tone: "pending" },
};

export const defaultTimerRecoveryState: TimerRecoveryState = {
  heartbeatLabel: "마지막 연결 확인 58초 전",
  localStateLabel: "기기 안 복구 상태 저장됨",
  serverTimeLabel: "서버 기록 03:42:18",
  status: "RUNNING",
  taskTitle: "1차 번역본 검토",
};

export const defaultSyncItems: SyncItem[] = [
  {
    description: "타이머 시작과 종료는 서버 작업 시간 기록에 바로 반영합니다.",
    label: "서버 작업시간",
    status: "SENT",
  },
  {
    description: "앱이 꺼져도 이어서 확인할 수 있도록 실행 중 상태를 기기 안에 남깁니다.",
    label: "기기 안 복구 상태",
    status: "SENT",
  },
  {
    description: "네트워크가 끊긴 동안 생긴 이벤트는 재연결 후 중복되지 않게 보냅니다.",
    label: "전송 대기열",
    status: "WAITING",
  },
];

export const defaultTimerRules: TimerRule[] = [
  {
    description: "총 작업시간과 진행 중 타이머는 웹에서도 보여야 하므로 서버 작업 시간 기록을 기준으로 둡니다.",
    label: "서버 기록",
    tone: "timer",
  },
  {
    description: "Tauri는 빠른 표시, 비정상 종료 복구, 미전송 작업 대기열을 맡습니다.",
    label: "기기 안 복구",
    tone: "personal",
  },
  {
    description: "실행 중 화면은 마지막 heartbeat 기준 계산값이고, 종료 시 확정 시간이 저장됩니다.",
    label: "확정 시점 분리",
    tone: "approved",
  },
];

export function TimerRecoveryBoundaryPanel({
  className,
  recoveryPercent,
  recoveryState,
  rules,
  syncItems,
  title,
  ...props
}: TimerRecoveryBoundaryPanelProps) {
  const { t } = useI18n();
  const runStatus = runStatusMeta[recoveryState.status];
  const pendingCount = syncItems.filter((item) => item.status !== "SENT").length;
  const panelTitle = title ?? t("timer.boundary.defaultTitle");

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Clock3 size={16} strokeWidth={2.1} />}>{t("timer.boundary.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{panelTitle}</h2>
            <p className={styles.description}>{t("timer.boundary.description")}</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{recoveryState.taskTitle}</span>
          <strong>{recoveryState.serverTimeLabel}</strong>
          <StatusBadge tone={runStatus.tone}>{t(runStatus.labelKey)}</StatusBadge>
        </div>
      </header>

      <section className={styles.recoveryGrid} aria-label={t("timer.boundary.gridAria")}>
        <article className={styles.boundaryCard}>
          <span className={styles.iconTile}>
            <Server size={19} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <StatusBadge tone="timer">{t("timer.boundary.serverRecord")}</StatusBadge>
            <h3>{t("timer.boundary.serverRecordTitle")}</h3>
            <p>{t("timer.boundary.serverRecordDesc")}</p>
          </div>
        </article>

        <article className={styles.centerCard}>
          <span className={styles.iconTile}>
            <HeartPulse size={20} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <Chip selected>{recoveryState.heartbeatLabel}</Chip>
          <h3>{recoveryState.status === "RECOVERY_NEEDED" ? t("timer.boundary.needConfirm") : t("timer.boundary.keepingRecord")}</h3>
          <p>{recoveryState.localStateLabel}</p>
          <ProgressBar label={t("timer.boundary.recoveryRate")} value={recoveryPercent} />
          <Button icon={<RotateCw size={15} strokeWidth={2.1} />} size="sm" variant="secondary">
            {t("timer.boundary.checkRecoveryFlow")}
          </Button>
        </article>

        <article className={styles.boundaryCard}>
          <span className={styles.iconTile}>
            <Database size={19} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <StatusBadge tone="personal">{t("timer.boundary.deviceStorage")}</StatusBadge>
            <h3>{t("timer.boundary.recoveryState")}</h3>
            <p>{t("timer.boundary.recoveryStateDesc")}</p>
          </div>
        </article>
      </section>

      <section className={styles.syncList} aria-label={t("timer.boundary.syncListAria")}>
        {syncItems.map((item) => {
          const status = syncStatusMeta[item.status];

          return (
            <article className={styles.syncItem} key={item.label}>
              <span className={styles.iconTile}>
                {item.status === "SENT" ? (
                  <CheckCircle2 size={18} strokeWidth={2.1} aria-hidden="true" />
                ) : (
                  <AlertCircle size={18} strokeWidth={2.1} aria-hidden="true" />
                )}
              </span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.description}</p>
              </div>
              <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
            </article>
          );
        })}
      </section>

      <section className={styles.metaStrip} aria-label={t("timer.boundary.summaryAria")}>
        <span>
          <Activity size={15} strokeWidth={2.1} aria-hidden="true" />
          {t("timer.boundary.pendingCount", { count: pendingCount })}
        </span>
        <span>{t("timer.boundary.heartbeatDefault")}</span>
        <span>{t("timer.boundary.recoveryThreshold")}</span>
      </section>

      <section className={styles.ruleGrid} aria-label={t("timer.boundary.ruleAria")}>
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
