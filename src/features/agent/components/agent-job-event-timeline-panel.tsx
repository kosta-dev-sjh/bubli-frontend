"use client";

import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
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

const statusMeta: Record<AgentJobStatus, { icon: ReactNode; labelKey: MessageKey; tone: StatusTone }> = {
  pending: {
    icon: <Clock3 size={18} strokeWidth={2.1} />,
    labelKey: "agent.timeline.statusPending",
    tone: "pending",
  },
  running: {
    icon: <LoaderCircle size={18} strokeWidth={2.1} />,
    labelKey: "agent.timeline.statusRunning",
    tone: "agent",
  },
  succeeded: {
    icon: <CheckCircle2 size={18} strokeWidth={2.1} />,
    labelKey: "agent.timeline.statusSucceeded",
    tone: "success",
  },
  failed: {
    icon: <AlertTriangle size={18} strokeWidth={2.1} />,
    labelKey: "agent.timeline.statusFailed",
    tone: "warning",
  },
  canceled: {
    icon: <XCircle size={18} strokeWidth={2.1} />,
    labelKey: "agent.timeline.statusCanceled",
    tone: "neutral",
  },
};

const eventMeta: Record<AgentJobEventType, { icon: ReactNode; labelKey: MessageKey; tone: StatusTone }> = {
  created: {
    icon: <Clock3 size={17} strokeWidth={2.1} />,
    labelKey: "agent.timeline.eventCreated",
    tone: "pending",
  },
  started: {
    icon: <LoaderCircle size={17} strokeWidth={2.1} />,
    labelKey: "agent.timeline.eventStarted",
    tone: "agent",
  },
  retried: {
    icon: <RotateCcw size={17} strokeWidth={2.1} />,
    labelKey: "agent.timeline.eventRetried",
    tone: "warning",
  },
  failed: {
    icon: <AlertTriangle size={17} strokeWidth={2.1} />,
    labelKey: "agent.timeline.eventFailed",
    tone: "warning",
  },
  succeeded: {
    icon: <CheckCircle2 size={17} strokeWidth={2.1} />,
    labelKey: "agent.timeline.eventSucceeded",
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
  title,
  ...props
}: AgentJobEventTimelinePanelProps) {
  const { t } = useI18n();
  const statusInfo = statusMeta[status];
  const canRetry = status === "failed";
  const resolvedTitle = title ?? t("agent.timeline.defaultTitle");

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<ShieldCheck size={14} strokeWidth={2.1} />}>{t("agent.timeline.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{resolvedTitle}</h2>
            <p className={styles.description}>{t("agent.timeline.desc")}</p>
          </div>
        </div>
        <div className={styles.statusCard}>
          <span className={styles.statusIcon} aria-hidden="true">
            {statusInfo.icon}
          </span>
          <div>
            <span>{t("agent.timeline.currentStatus")}</span>
            <strong>{t(statusInfo.labelKey)}</strong>
          </div>
        </div>
      </header>

      <section className={styles.summaryGrid} aria-label={t("agent.timeline.summaryAria")}>
        <article>
          <span>{t("agent.timeline.summaryJob")}</span>
          <strong>{jobId}</strong>
        </article>
        <article>
          <span>{t("agent.timeline.summaryJobType")}</span>
          <strong>{jobType}</strong>
        </article>
        <article>
          <span>{t("agent.timeline.summaryTarget")}</span>
          <strong>{targetLabel}</strong>
        </article>
        <article>
          <span>{t("agent.timeline.summaryRetry")}</span>
          <strong>{t("agent.timeline.retryCount", { count: retryCount })}</strong>
        </article>
      </section>

      {errorMessage ? (
        <section className={styles.errorBox} aria-label={t("agent.timeline.errorAria")}>
          <AlertTriangle size={18} strokeWidth={2.1} aria-hidden="true" />
          <div>
            <strong>{t("agent.timeline.errorTitle")}</strong>
            <p>{errorMessage}</p>
          </div>
          {canRetry ? (
            <Button icon={<RotateCcw size={15} strokeWidth={2.1} />} size="sm" variant="quiet">
              {t("agent.timeline.retry")}
            </Button>
          ) : null}
        </section>
      ) : null}

      <section className={styles.timeline} aria-label={t("agent.timeline.listAria")}>
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
                    <h3>{t(meta.labelKey)}</h3>
                    <p>{event.message}</p>
                  </div>
                  <div className={styles.eventMeta}>
                    <StatusBadge tone={meta.tone}>{t(meta.labelKey)}</StatusBadge>
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
