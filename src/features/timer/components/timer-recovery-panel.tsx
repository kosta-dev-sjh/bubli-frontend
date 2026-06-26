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

const statusCopy: Record<TimerRecoveryStatus, string> = {
  RUNNING: "실행 중",
  PAUSED: "일시정지",
  STOPPED: "종료됨",
  RECOVERY_NEEDED: "복구 확인 필요",
  RECOVERED: "복구 완료",
};

const statusTone: Record<TimerRecoveryStatus, StatusTone> = {
  RUNNING: "timer",
  PAUSED: "pending",
  STOPPED: "neutral",
  RECOVERY_NEEDED: "warning",
  RECOVERED: "success",
};

const defaultMetrics: TimerRecoveryMetric[] = [
  {
    description: "시작, 일시정지, 재개, 종료, 연결 확인 신호를 저장합니다.",
    id: "server",
    label: "서버 기록",
    tone: "room",
    value: "작업 시간 기록",
  },
  {
    description: "앱 재실행 시 서버 기록과 비교해 복구 안내를 띄웁니다.",
    id: "local-state",
    label: "기기 안 복구 상태",
    tone: "personal",
    value: "최근 실행 상태",
  },
  {
    description: "네트워크가 끊긴 동안 생긴 이벤트를 중복 없이 다시 보냅니다.",
    id: "outbox",
    label: "미전송 대기열",
    tone: "pending",
    value: "보낼 작업 목록",
  },
];

export function TimerRecoveryPanel({
  className,
  heartbeatAgeSeconds = 42,
  heartbeatIntervalSeconds = 60,
  modeLabel = "작업 타이머",
  onConfirmStop,
  onRecoverTimer,
  onResendOutbox,
  onSendHeartbeat,
  projectLabel = "Bubli 제품 개발",
  recoveryThresholdSeconds = 90,
  serverStatusLabel = "마지막 연결 확인 42초 전",
  status = "RUNNING",
  taskLabel = "자료보드 검수",
  timeLabel = "42:18",
  unsentEventCount = 2,
  ...props
}: TimerRecoveryPanelProps) {
  const heartbeatPercent = Math.min(100, Math.round((heartbeatAgeSeconds / recoveryThresholdSeconds) * 100));
  const isRecoveryNeeded = status === "RECOVERY_NEEDED";
  const events: TimerRecoveryEvent[] = [
    {
      detail: `${heartbeatIntervalSeconds}초마다 서버에 실행 상태를 보냅니다.`,
      id: "heartbeat",
      label: "연결 확인 주기",
      tone: "timer",
    },
    {
      detail: `${recoveryThresholdSeconds}초 이상 신호가 없으면 복구 확인 대상으로 봅니다.`,
      id: "threshold",
      label: "복구 기준",
      tone: isRecoveryNeeded ? "warning" : "success",
    },
    {
      detail: `${unsentEventCount}개 이벤트가 중복 방지 키 기준 재전송을 기다립니다.`,
      id: "outbox",
      label: "대기열",
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
            <StatusBadge tone={statusTone[status]}>{statusCopy[status]}</StatusBadge>
            <h2>타이머 복구 상태</h2>
            <p>작업 시간은 서버 기록을 기준으로 남기고, Tauri 앱은 끊긴 순간의 복구 단서를 보관합니다.</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<Wifi size={15} />} onClick={onSendHeartbeat} size="sm" variant="quiet">
            연결 확인 보내기
          </Button>
          <Button icon={<RefreshCcw size={15} />} onClick={onResendOutbox} size="sm" variant="primary">
            대기열 재전송
          </Button>
        </div>
      </header>

      <div className={styles.timerGrid}>
        <article className={styles.timerFace} aria-label="현재 타이머">
          <div className={styles.timerMeta}>
            <Chip>{modeLabel}</Chip>
            <StatusBadge tone={statusTone[status]}>{serverStatusLabel}</StatusBadge>
          </div>
          <strong>{timeLabel}</strong>
          <p>{taskLabel}</p>
          <span>{projectLabel}</span>
        </article>

        <article className={styles.heartbeatCard}>
          <div className={styles.heartbeatHeader}>
            <span aria-hidden="true">
              <Clock3 size={18} />
            </span>
            <div>
              <strong>{heartbeatAgeSeconds}초</strong>
              <p>마지막 서버 신호 이후 경과 시간</p>
            </div>
          </div>
          <ProgressBar label="복구 기준까지 남은 연결 확인 여유" value={heartbeatPercent} />
          <p>
            실행 중 화면 시간은 계산값입니다. 실제 작업 시간은 종료 또는 복구 확정 뒤 확정합니다.
          </p>
        </article>
      </div>

      <div className={styles.metricGrid} aria-label="타이머 저장 위치">
        {defaultMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className={styles.recoveryBox} data-state={isRecoveryNeeded ? "warning" : "stable"}>
        <div className={styles.recoveryCopy}>
          <span aria-hidden="true">{isRecoveryNeeded ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}</span>
          <div>
            <strong>{isRecoveryNeeded ? "작업 시간 확인이 필요합니다." : "서버 기록과 로컬 상태가 이어져 있습니다."}</strong>
            <p>
              서버에 반영된 기록이 있으면 서버 값을 우선합니다. 로컬에만 남은 이벤트는 같은 키로 다시 보내
              중복 반영을 막습니다.
            </p>
          </div>
        </div>
        <div className={styles.recoveryActions}>
          <Button icon={<Play size={15} />} onClick={onRecoverTimer} size="sm" variant="primary">
            이어서 진행
          </Button>
          <Button icon={<CheckCircle2 size={15} />} onClick={onConfirmStop} size="sm" variant="quiet">
            마지막 기록에서 종료
          </Button>
        </div>
      </div>

      <div className={styles.eventList} aria-label="복구 판단 기준">
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
