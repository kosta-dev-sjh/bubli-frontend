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

const runStatusMeta: Record<TimerRunStatus, { label: string; tone: StatusTone }> = {
  PAUSED: { label: "일시정지", tone: "pending" },
  RECOVERY_NEEDED: { label: "복구 확인", tone: "warning" },
  RUNNING: { label: "실행 중", tone: "timer" },
  STOPPED: { label: "종료", tone: "approved" },
};

const syncStatusMeta: Record<SyncItemStatus, { label: string; tone: StatusTone }> = {
  RETRYING: { label: "다시 전송", tone: "warning" },
  SENT: { label: "전송됨", tone: "approved" },
  WAITING: { label: "대기", tone: "pending" },
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
  title = "타이머 복구 상태",
  ...props
}: TimerRecoveryBoundaryPanelProps) {
  const runStatus = runStatusMeta[recoveryState.status];
  const pendingCount = syncItems.filter((item) => item.status !== "SENT").length;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<Clock3 size={16} strokeWidth={2.1} />}>작업 시간 기록</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              타이머는 서버 기록을 기준으로 두고, Tauri는 실행 중 상태와 미전송 작업을 보관합니다. 앱이 비정상
              종료되어도 마지막 기록을 기준으로 복구할 수 있게 합니다.
            </p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <span>{recoveryState.taskTitle}</span>
          <strong>{recoveryState.serverTimeLabel}</strong>
          <StatusBadge tone={runStatus.tone}>{runStatus.label}</StatusBadge>
        </div>
      </header>

      <section className={styles.recoveryGrid} aria-label="타이머 저장 경계">
        <article className={styles.boundaryCard}>
          <span className={styles.iconTile}>
            <Server size={19} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <StatusBadge tone="timer">서버 기록</StatusBadge>
            <h3>작업 시간 기록</h3>
            <p>총 작업시간, 시작, 일시정지, 재개, 종료 이벤트의 기준 기록입니다.</p>
          </div>
        </article>

        <article className={styles.centerCard}>
          <span className={styles.iconTile}>
            <HeartPulse size={20} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <Chip selected>{recoveryState.heartbeatLabel}</Chip>
          <h3>{recoveryState.status === "RECOVERY_NEEDED" ? "사용자 확인 필요" : "기록 유지 중"}</h3>
          <p>{recoveryState.localStateLabel}</p>
          <ProgressBar label="타이머 복구 준비율" value={recoveryPercent} />
          <Button icon={<RotateCw size={15} strokeWidth={2.1} />} size="sm" variant="secondary">
            복구 흐름 확인
          </Button>
        </article>

        <article className={styles.boundaryCard}>
          <span className={styles.iconTile}>
            <Database size={19} strokeWidth={2.1} aria-hidden="true" />
          </span>
          <div>
            <StatusBadge tone="personal">기기 안 저장소</StatusBadge>
            <h3>복구 상태</h3>
            <p>실행 중 상태, 미전송 이벤트, 복구 안내에 필요한 최근 상태를 보관합니다.</p>
          </div>
        </article>
      </section>

      <section className={styles.syncList} aria-label="타이머 동기화 항목">
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
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </article>
          );
        })}
      </section>

      <section className={styles.metaStrip} aria-label="타이머 복구 요약">
        <span>
          <Activity size={15} strokeWidth={2.1} aria-hidden="true" />
          미전송 항목 {pendingCount}개
        </span>
        <span>heartbeat 기본 60초</span>
        <span>90초 이상 신호가 없으면 복구 확인</span>
      </section>

      <section className={styles.ruleGrid} aria-label="타이머 저장 기준">
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
