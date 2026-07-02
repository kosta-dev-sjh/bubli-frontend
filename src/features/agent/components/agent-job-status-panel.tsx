"use client";

import { AlertTriangle, Bell, CheckCircle2, Clock3, FileSearch, ListChecks, LoaderCircle, RefreshCcw, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import type { HTMLAttributes } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./agent-job-status-panel.module.css";

export type AgentJobStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";
export type AgentSuggestionStatus = "DRAFT" | "APPROVED" | "HELD" | "REJECTED";

export type AgentJobStep = {
  description: string;
  id: string;
  label: string;
  status: AgentJobStatus;
};

export type AgentSuggestionGroup = {
  count: number;
  id: string;
  label: string;
  status: AgentSuggestionStatus;
};

type AgentJobStatusPanelProps = HTMLAttributes<HTMLElement> & {
  eventLabel?: string;
  jobId?: string;
  jobTypeLabel?: string;
  modelLabel?: string;
  onOpenSuggestions?: () => void;
  onRetryJob?: () => void;
  progress?: number;
  schemaLabel?: string;
  startedAtLabel?: string;
  status?: AgentJobStatus;
  steps?: AgentJobStep[];
  suggestionGroups?: AgentSuggestionGroup[];
};

const statusCopyKeys: Record<AgentJobStatus, MessageKey> = {
  PENDING: "agent.status.statusPending",
  RUNNING: "agent.status.statusRunning",
  SUCCEEDED: "agent.status.statusSucceeded",
  FAILED: "agent.status.statusFailed",
  CANCELED: "agent.status.statusCanceled",
};

const statusTone: Record<AgentJobStatus, "neutral" | "pending" | "success" | "warning"> = {
  PENDING: "neutral",
  RUNNING: "pending",
  SUCCEEDED: "success",
  FAILED: "warning",
  CANCELED: "neutral",
};

const suggestionCopyKeys: Record<AgentSuggestionStatus, MessageKey> = {
  DRAFT: "agent.status.suggestionDraft",
  APPROVED: "agent.status.suggestionApproved",
  HELD: "agent.status.suggestionHeld",
  REJECTED: "agent.status.suggestionRejected",
};

const suggestionTone: Record<AgentSuggestionStatus, "pending" | "approved" | "warning" | "neutral"> = {
  DRAFT: "pending",
  APPROVED: "approved",
  HELD: "warning",
  REJECTED: "neutral",
};

// label/description 필드는 t() 키를 담고 렌더 시 번역한다(호출부 문자열은 t() 폴백으로 그대로 통과).
const defaultSteps: AgentJobStep[] = [
  {
    description: "agent.status.step1Desc",
    id: "created",
    label: "agent.status.step1Label",
    status: "SUCCEEDED",
  },
  {
    description: "agent.status.step2Desc",
    id: "analyzing",
    label: "agent.status.step2Label",
    status: "RUNNING",
  },
  {
    description: "agent.status.step3Desc",
    id: "suggestions",
    label: "agent.status.step3Label",
    status: "PENDING",
  },
  {
    description: "agent.status.step4Desc",
    id: "notify",
    label: "agent.status.step4Label",
    status: "PENDING",
  },
];

const defaultSuggestionGroups: AgentSuggestionGroup[] = [
  {
    count: 3,
    id: "wbs",
    label: "agent.status.groupWbs",
    status: "DRAFT",
  },
  {
    count: 5,
    id: "todo",
    label: "agent.status.groupTodo",
    status: "DRAFT",
  },
  {
    count: 2,
    id: "questions",
    label: "agent.status.groupQuestions",
    status: "HELD",
  },
];

function getStatusIcon(status: AgentJobStatus) {
  if (status === "SUCCEEDED") {
    return <CheckCircle2 size={18} />;
  }

  if (status === "FAILED") {
    return <AlertTriangle size={18} />;
  }

  if (status === "CANCELED") {
    return <XCircle size={18} />;
  }

  if (status === "RUNNING") {
    return <LoaderCircle size={18} />;
  }

  return <Clock3 size={18} />;
}

export function AgentJobStatusPanel({
  className,
  eventLabel,
  jobId,
  jobTypeLabel,
  modelLabel,
  onOpenSuggestions,
  onRetryJob,
  progress = 62,
  schemaLabel,
  startedAtLabel,
  status = "RUNNING",
  steps = defaultSteps,
  suggestionGroups = defaultSuggestionGroups,
  ...props
}: AgentJobStatusPanelProps) {
  const { t } = useI18n();
  const resolvedEventLabel = eventLabel ?? t("agent.status.eventLabel");
  const resolvedJobId = jobId ?? t("agent.status.jobId");
  const resolvedJobTypeLabel = jobTypeLabel ?? t("agent.status.jobTypeLabel");
  const resolvedModelLabel = modelLabel ?? t("agent.status.modelLabel");
  const resolvedSchemaLabel = schemaLabel ?? t("agent.status.schemaLabel");
  const resolvedStartedAtLabel = startedAtLabel ?? t("agent.status.startedAtLabel");
  const draftCount = suggestionGroups
    .filter((group) => group.status === "DRAFT" || group.status === "HELD")
    .reduce((sum, group) => sum + group.count, 0);

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={cn(styles.statusOrb, styles[`statusOrb${status}`])} aria-hidden="true">
            {getStatusIcon(status)}
          </span>
          <div>
            <StatusBadge tone={statusTone[status]}>{t(statusCopyKeys[status])}</StatusBadge>
            <h2>{t("agent.status.title")}</h2>
            <p>{t("agent.status.subtitle")}</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<ListChecks size={15} />} onClick={onOpenSuggestions} size="sm" variant="primary">
            {t("agent.status.reviewCandidates")}
          </Button>
          <Button icon={<RefreshCcw size={15} />} onClick={onRetryJob} size="sm" variant="quiet">
            {t("agent.status.retry")}
          </Button>
        </div>
      </header>

      <div className={styles.jobCard}>
        <div className={styles.jobMeta}>
          <Chip icon={<Sparkles size={14} />}>{resolvedJobTypeLabel}</Chip>
          <Chip icon={<Clock3 size={14} />}>{resolvedStartedAtLabel}</Chip>
          <Chip icon={<ShieldCheck size={14} />}>{resolvedSchemaLabel}</Chip>
        </div>
        <div className={styles.progressRow}>
          <div>
            <strong>{resolvedJobId}</strong>
            <span>{resolvedModelLabel}</span>
          </div>
          <span>{progress}%</span>
        </div>
        <ProgressBar label={t("agent.status.progressLabel")} value={progress} />
      </div>

      <div className={styles.grid}>
        <section className={styles.stepPanel} aria-label={t("agent.status.stepsAria")}>
          <h3>
            <FileSearch size={17} />
            {t("agent.status.processSteps")}
          </h3>
          <ol className={styles.stepList}>
            {steps.map((step) => (
              <li className={styles.stepItem} key={step.id}>
                <span className={cn(styles.stepIcon, styles[`stepIcon${step.status}`])} aria-hidden="true">
                  {getStatusIcon(step.status)}
                </span>
                <div>
                  <div className={styles.stepHead}>
                    <strong>{t(step.label as MessageKey)}</strong>
                    <StatusBadge tone={statusTone[step.status]}>{t(statusCopyKeys[step.status])}</StatusBadge>
                  </div>
                  <p>{t(step.description as MessageKey)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.suggestionPanel} aria-label={t("agent.status.suggestionStateAria")}>
          <h3>
            <ListChecks size={17} />
            {t("agent.status.suggestionState")}
          </h3>
          <div className={styles.suggestionList}>
            {suggestionGroups.map((group) => (
              <article className={styles.suggestionCard} key={group.id}>
                <div>
                  <strong>{t(group.label as MessageKey)}</strong>
                  <span>{t("agent.status.countItems", { count: group.count })}</span>
                </div>
                <StatusBadge tone={suggestionTone[group.status]}>{t(suggestionCopyKeys[group.status])}</StatusBadge>
              </article>
            ))}
          </div>
          <div className={styles.notice}>
            <Bell size={16} />
            <span>{resolvedEventLabel}</span>
          </div>
        </section>
      </div>

      <footer className={styles.boundary}>
        <div>
          <ShieldCheck size={18} />
          <strong>{t("agent.status.boundaryTitle")}</strong>
        </div>
        <p>{t("agent.status.boundaryDesc", { count: draftCount })}</p>
      </footer>
    </GlassPanel>
  );
}
