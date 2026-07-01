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

const statusMeta: Record<TimerControlStatus, { label: string; tone: StatusTone }> = {
  IDLE: { label: "대기", tone: "neutral" },
  PAUSED: { label: "일시정지", tone: "pending" },
  RECOVERY_NEEDED: { label: "복구 확인", tone: "warning" },
  RUNNING: { label: "실행 중", tone: "timer" },
  SYNC_WAITING: { label: "전송 대기", tone: "pending" },
};

export const defaultTimerControlState: TimerControlState = {
  elapsedLabel: "25:00",
  heartbeatLabel: "마지막 신호 18초 전",
  id: "timer-current-focus",
  projectRoomLabel: "브랜드 상세페이지",
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
  const status = statusMeta[state.status];
  const canStart = state.status === "IDLE" || state.status === "RECOVERY_NEEDED";
  const canPause = state.status === "RUNNING" || state.status === "SYNC_WAITING";
  const canResume = state.status === "PAUSED";
  const heartbeatPercent = state.status === "RECOVERY_NEEDED" ? 100 : 36;

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<TimerReset size={15} strokeWidth={2.1} />}>타이머</Chip>
          <div>
            <h2 className={styles.title}>작업 시간을 바로 기록합니다</h2>
            <p className={styles.description}>
              타이머 시작, 일시정지, 재개, 종료는 서버 기록을 기준으로 남기고 Tauri 앱은 끊긴 순간의 복구 단서를 함께 보관합니다.
            </p>
          </div>
        </div>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </header>

      <section className={styles.timerFace} aria-label="현재 타이머">
        <div className={styles.timerMeta}>
          <span>{state.projectRoomLabel ?? "개인 작업"}</span>
          <StatusBadge tone={status.tone}>{state.heartbeatLabel}</StatusBadge>
        </div>
        <strong>{state.elapsedLabel}</strong>
        <p>{state.taskLabel}</p>
      </section>

      <div className={styles.controlRow} aria-label="타이머 조작">
        <Button disabled={!canStart} icon={<Play size={15} strokeWidth={2.1} />} onClick={() => onStart?.(state.id)} variant="primary">
          시작
        </Button>
        <Button disabled={!canPause} icon={<Pause size={15} strokeWidth={2.1} />} onClick={() => onPause?.(state.id)} variant="secondary">
          일시정지
        </Button>
        <Button disabled={!canResume} icon={<RotateCcw size={15} strokeWidth={2.1} />} onClick={() => onResume?.(state.id)} variant="secondary">
          재개
        </Button>
        <Button icon={<Square size={15} strokeWidth={2.1} />} onClick={() => onStop?.(state.id)} variant="quiet">
          종료
        </Button>
      </div>

      <section className={styles.infoGrid} aria-label="타이머 저장 요약">
        <article>
          <Clock3 size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>오늘 누적</span>
          <strong>{state.todayTotalLabel}</strong>
          <p>서버 기록 기준</p>
        </article>
        <article>
          <HeartPulse size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>heartbeat</span>
          <strong>60초</strong>
          <p>실행 상태 확인</p>
        </article>
        <article>
          <WifiOff size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>미전송</span>
          <strong>{state.unsentEventCount}개</strong>
          <p>재연결 시 전송</p>
        </article>
        <article>
          <CalendarClock size={17} strokeWidth={2.1} aria-hidden="true" />
          <span>표시 위치</span>
          <strong>데스크탑 위젯</strong>
          <p>대시보드도 같은 기록 사용</p>
        </article>
      </section>

      <section className={styles.syncBox} aria-label="타이머 동기화 기준">
        <div>
          <span>복구 기준</span>
          <strong>90초 이상 신호가 없으면 확인</strong>
        </div>
        <ProgressBar value={heartbeatPercent} />
        <p>네트워크가 끊기면 조작 이벤트를 로컬 대기열에 남기고, 같은 키로 다시 보내 중복 기록을 막습니다.</p>
      </section>
    </GlassPanel>
  );
}
