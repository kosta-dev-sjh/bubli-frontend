import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import styles from "./agent-job-event-timeline-panel.module.css";

type AgentJobStatus = "pending" | "running" | "succeeded" | "failed" | "canceled";
type AgentJobEventType = "created" | "started" | "retried" | "failed" | "succeeded";

type AgentJobEvent = {
  eventType: AgentJobEventType;
  message: string;
  timeLabel: string;
};

export type AgentJobEventTimelinePanelProps = HTMLAttributes<HTMLElement> & {
  errorMessage?: string;
  events: AgentJobEvent[];
  jobId: string;
  jobType: string;
  retryCount: number;
  status: AgentJobStatus;
  targetLabel: string;
  title?: string;
};

const statusMeta: Record<AgentJobStatus, { icon: ReactNode; label: string; tone: StatusTone }> = {
  pending: {
    icon: <Clock3 size={18} strokeWidth={2.1} />,
    label: "대기",
    tone: "pending",
  },
  running: {
    icon: <LoaderCircle size={18} strokeWidth={2.1} />,
    label: "실행 중",
    tone: "agent",
  },
  succeeded: {
    icon: <CheckCircle2 size={18} strokeWidth={2.1} />,
    label: "성공",
    tone: "success",
  },
  failed: {
    icon: <AlertTriangle size={18} strokeWidth={2.1} />,
    label: "실패",
    tone: "warning",
  },
  canceled: {
    icon: <XCircle size={18} strokeWidth={2.1} />,
    label: "취소",
    tone: "neutral",
  },
};

const eventMeta: Record<AgentJobEventType, { icon: ReactNode; label: string; tone: StatusTone }> = {
  created: {
    icon: <Clock3 size={17} strokeWidth={2.1} />,
    label: "생성",
    tone: "pending",
  },
  started: {
    icon: <LoaderCircle size={17} strokeWidth={2.1} />,
    label: "시작",
    tone: "agent",
  },
  retried: {
    icon: <RotateCcw size={17} strokeWidth={2.1} />,
    label: "재시도",
    tone: "warning",
  },
  failed: {
    icon: <AlertTriangle size={17} strokeWidth={2.1} />,
    label: "실패",
    tone: "warning",
  },
  succeeded: {
    icon: <CheckCircle2 size={17} strokeWidth={2.1} />,
    label: "완료",
    tone: "success",
  },
};

export function AgentJobEventTimelinePanel({
  className,
  errorMessage,
  events,
  jobId,
  jobType,
  retryCount,
  status,
  targetLabel,
  title = "에이전트 정리 작업 흐름",
  ...props
}: AgentJobEventTimelinePanelProps) {
  const statusInfo = statusMeta[status];
  const canRetry = status === "failed";

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<ShieldCheck size={14} strokeWidth={2.1} />}>작업 흐름</Chip>
          <div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
              에이전트가 자료를 정리하는 동안 각 단계를 남깁니다. 결과가 만들어져도 사용자 승인 전에는 작업, WBS, 일정에 반영하지 않습니다.
            </p>
          </div>
        </div>
        <div className={styles.statusCard}>
          <span className={styles.statusIcon} aria-hidden="true">
            {statusInfo.icon}
          </span>
          <div>
            <span>현재 상태</span>
            <strong>{statusInfo.label}</strong>
          </div>
        </div>
      </header>

      <section className={styles.summaryGrid} aria-label="에이전트 정리 작업 요약">
        <article>
          <span>정리 작업</span>
          <strong>{jobId}</strong>
        </article>
        <article>
          <span>작업 종류</span>
          <strong>{jobType}</strong>
        </article>
        <article>
          <span>대상</span>
          <strong>{targetLabel}</strong>
        </article>
        <article>
          <span>다시 시도</span>
          <strong>{retryCount}회</strong>
        </article>
      </section>

      {errorMessage ? (
        <section className={styles.errorBox} aria-label="실패 사유">
          <AlertTriangle size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>실패 사유</strong>
            <p>{errorMessage}</p>
          </div>
          {canRetry ? (
            <Button icon={<RotateCcw size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
              다시 시도
            </Button>
          ) : null}
        </section>
      ) : null}

      <section className={styles.timeline} aria-label="에이전트 정리 흐름 목록">
        {events.map((event, index) => {
          const meta = eventMeta[event.eventType];
          const isLast = index === events.length - 1;

          return (
            <article className={styles.eventItem} key={`${event.eventType}-${event.timeLabel}-${index}`}>
              <div className={styles.eventMarker} data-last={isLast}>
                <span aria-hidden="true">{meta.icon}</span>
              </div>
              <div className={styles.eventBody}>
                <div className={styles.eventHeader}>
                  <div>
                    <h3>{meta.label}</h3>
                    <p>{event.message}</p>
                  </div>
                  <div className={styles.eventMeta}>
                    <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                    <span>{event.timeLabel}</span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </GlassPanel>
  );
}
