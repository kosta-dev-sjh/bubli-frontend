"use client";

import {
  Bot,
  CheckCircle2,
  CircleDashed,
  Database,
  FileText,
  FolderLock,
  Link2,
  RefreshCw,
  RotateCcw,
  ScissorsLineDashed,
  ShieldCheck,
  UploadCloud,
  UsersRound,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./resource-processing-status-panel.module.css";

export type ResourceVisibility = "PERSONAL" | "ROOM_SHARED";
export type ResourceStatus = "UPLOADING" | "READY" | "ANALYZING" | "ANALYZED" | "FAILED";
export type ProcessingStepStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
export type ProcessingStepKind = "UPLOAD" | "TEXT_EXTRACTION" | "CHUNKING" | "EMBEDDING" | "ANALYSIS" | "RELATION";

export type ProcessingStep = {
  detailLabelKey?: MessageKey;
  kind: ProcessingStepKind;
  labelKey: MessageKey;
  progress?: number;
  status: ProcessingStepStatus;
  supportingTextKey: MessageKey;
};

export type ResourceProcessingStatusPanelProps = {
  className?: string;
  onOpenAnalysis?: () => void;
  onOpenResource?: () => void;
  onRetryFailedStep?: () => void;
  resourceTitle?: string;
  status?: ResourceStatus;
  steps?: ProcessingStep[];
  visibility?: ResourceVisibility;
};

const statusCopyKey: Record<ResourceStatus, MessageKey> = {
  ANALYZED: "resources.processing.status.ANALYZED",
  ANALYZING: "resources.processing.status.ANALYZING",
  FAILED: "resources.processing.status.FAILED",
  READY: "resources.processing.status.READY",
  UPLOADING: "resources.processing.status.UPLOADING",
};

const statusTone: Record<ResourceStatus, StatusTone> = {
  ANALYZED: "approved",
  ANALYZING: "agent",
  FAILED: "warning",
  READY: "success",
  UPLOADING: "pending",
};

const stepStatusCopyKey: Record<ProcessingStepStatus, MessageKey> = {
  FAILED: "resources.processing.step.FAILED",
  PENDING: "resources.processing.step.PENDING",
  RUNNING: "resources.processing.step.RUNNING",
  SKIPPED: "resources.processing.step.SKIPPED",
  SUCCEEDED: "resources.processing.step.SUCCEEDED",
};

const stepStatusTone: Record<ProcessingStepStatus, StatusTone> = {
  FAILED: "warning",
  PENDING: "pending",
  RUNNING: "agent",
  SKIPPED: "neutral",
  SUCCEEDED: "approved",
};

const stepIconMap: Record<ProcessingStepKind, typeof UploadCloud> = {
  ANALYSIS: Bot,
  CHUNKING: ScissorsLineDashed,
  EMBEDDING: Database,
  RELATION: Link2,
  TEXT_EXTRACTION: FileText,
  UPLOAD: UploadCloud,
};

const defaultSteps: ProcessingStep[] = [
  {
    detailLabelKey: "resources.processing.stepUploadDetail",
    kind: "UPLOAD",
    labelKey: "resources.processing.stepUploadLabel",
    progress: 100,
    status: "SUCCEEDED",
    supportingTextKey: "resources.processing.stepUploadText",
  },
  {
    detailLabelKey: "resources.processing.stepExtractDetail",
    kind: "TEXT_EXTRACTION",
    labelKey: "resources.processing.stepExtractLabel",
    progress: 100,
    status: "SUCCEEDED",
    supportingTextKey: "resources.processing.stepExtractText",
  },
  {
    detailLabelKey: "resources.processing.stepChunkDetail",
    kind: "CHUNKING",
    labelKey: "resources.processing.stepChunkLabel",
    progress: 100,
    status: "SUCCEEDED",
    supportingTextKey: "resources.processing.stepChunkText",
  },
  {
    detailLabelKey: "resources.processing.stepEmbedDetail",
    kind: "EMBEDDING",
    labelKey: "resources.processing.stepEmbedLabel",
    progress: 74,
    status: "RUNNING",
    supportingTextKey: "resources.processing.stepEmbedText",
  },
  {
    detailLabelKey: "resources.processing.stepAnalysisDetail",
    kind: "ANALYSIS",
    labelKey: "resources.processing.stepAnalysisLabel",
    progress: 0,
    status: "PENDING",
    supportingTextKey: "resources.processing.stepAnalysisText",
  },
  {
    detailLabelKey: "resources.processing.stepRelationDetail",
    kind: "RELATION",
    labelKey: "resources.processing.stepRelationLabel",
    progress: 0,
    status: "PENDING",
    supportingTextKey: "resources.processing.stepRelationText",
  },
];

function getStepProgress(step: ProcessingStep) {
  if (typeof step.progress === "number") {
    return step.progress;
  }

  if (step.status === "SUCCEEDED") {
    return 100;
  }

  if (step.status === "RUNNING") {
    return 50;
  }

  return 0;
}

function getOverallProgress(steps: ProcessingStep[]) {
  if (steps.length === 0) {
    return 0;
  }

  const total = steps.reduce((sum, step) => sum + getStepProgress(step), 0);

  return Math.round(total / steps.length);
}

export function ResourceProcessingStatusPanel({
  className,
  onOpenAnalysis,
  onOpenResource,
  onRetryFailedStep,
  resourceTitle,
  status = "ANALYZING",
  steps = defaultSteps,
  visibility = "ROOM_SHARED",
}: ResourceProcessingStatusPanelProps) {
  const { t } = useI18n();
  const resolvedResourceTitle = resourceTitle ?? t("resources.processing.defaultResourceTitle");
  const overallProgress = getOverallProgress(steps);
  const failedStep = steps.find((step) => step.status === "FAILED");
  const runningStep = steps.find((step) => step.status === "RUNNING");
  const VisibilityIcon = visibility === "ROOM_SHARED" ? UsersRound : FolderLock;

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<UploadCloud size={14} />}>{t("resources.processing.chip")}</Chip>
          <h2>{t("resources.processing.title")}</h2>
          <p>{t("resources.processing.desc")}</p>
        </div>
        <div className={styles.headerActions}>
          {failedStep ? (
            <Button icon={<RotateCcw size={15} />} onClick={onRetryFailedStep} size="sm" variant="quiet">
              {t("resources.processing.retryFailedStep")}
            </Button>
          ) : null}
          <Button icon={<FileText size={15} />} onClick={onOpenResource} size="sm" variant="ghost">
            {t("resources.processing.openResource")}
          </Button>
        </div>
      </header>

      <section className={styles.resourceCard} aria-label={t("resources.processing.resourceAria")}>
        <span className={styles.resourceIcon} aria-hidden="true">
          <VisibilityIcon size={20} strokeWidth={2.1} />
        </span>
        <div className={styles.resourceText}>
          <span>{visibility === "ROOM_SHARED" ? t("resources.processing.scopeRoom") : t("resources.processing.scopePersonal")}</span>
          <strong>{resolvedResourceTitle}</strong>
        </div>
        <StatusBadge tone={statusTone[status]}>{t(statusCopyKey[status])}</StatusBadge>
      </section>

      <section className={styles.progressSummary} aria-label={t("resources.processing.overallAria")}>
        <div>
          <strong>{overallProgress}%</strong>
          <span>
            {runningStep
              ? t("resources.processing.stepRunning", { label: t(runningStep.labelKey) })
              : t("resources.processing.flowWaiting")}
          </span>
        </div>
        <ProgressBar label={t("resources.processing.overallProgressLabel")} value={overallProgress} />
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.stepList} aria-label={t("resources.processing.stepListAria")}>
          {steps.map((step) => {
            const StepIcon = stepIconMap[step.kind];
            const isRunning = step.status === "RUNNING";
            const isFailed = step.status === "FAILED";

            return (
              <article className={cn(styles.stepCard, isRunning && styles.stepCardRunning, isFailed && styles.stepCardFailed)} key={step.kind}>
                <span className={styles.stepIcon} aria-hidden="true">
                  <StepIcon size={18} strokeWidth={2.1} />
                </span>
                <div className={styles.stepBody}>
                  <div className={styles.stepTop}>
                    <div>
                      <span>{step.detailLabelKey ? t(step.detailLabelKey) : null}</span>
                      <h3>{t(step.labelKey)}</h3>
                    </div>
                    <StatusBadge tone={stepStatusTone[step.status]}>{t(stepStatusCopyKey[step.status])}</StatusBadge>
                  </div>
                  <p>{t(step.supportingTextKey)}</p>
                  <ProgressBar label={t("resources.processing.stepProgressLabel", { label: t(step.labelKey) })} value={getStepProgress(step)} />
                </div>
              </article>
            );
          })}
        </section>

        <aside className={styles.policyPanel} aria-label={t("resources.processing.policyAria")}>
          <div className={styles.policyHeader}>
            <span className={styles.policyIcon} aria-hidden="true">
              <ShieldCheck size={20} strokeWidth={2.1} />
            </span>
            <div>
              <h3>{t("resources.processing.policyTitle")}</h3>
              <p>{t("resources.processing.policyDesc")}</p>
            </div>
          </div>

          <ul className={styles.policyList}>
            <li>
              <CheckCircle2 size={17} strokeWidth={2.1} />
              <div>
                <strong>{t("resources.processing.policyServerTitle")}</strong>
                <p>{t("resources.processing.policyServerDesc")}</p>
              </div>
            </li>
            <li>
              <CircleDashed size={17} strokeWidth={2.1} />
              <div>
                <strong>{t("resources.processing.policyCandidateTitle")}</strong>
                <p>{t("resources.processing.policyCandidateDesc")}</p>
              </div>
            </li>
            <li>
              <XCircle size={17} strokeWidth={2.1} />
              <div>
                <strong>{t("resources.processing.policyFailedTitle")}</strong>
                <p>{t("resources.processing.policyFailedDesc")}</p>
              </div>
            </li>
          </ul>

          <div className={styles.storageFlow}>
            <span>{t("resources.processing.flowOriginal")}</span>
            <RefreshCw size={15} />
            <span>{t("resources.processing.flowCandidate")}</span>
            <RefreshCw size={15} />
            <span>{t("resources.processing.flowConfirm")}</span>
          </div>

          <Button icon={<Bot size={15} />} onClick={onOpenAnalysis} size="sm" variant="quiet">
            {t("resources.processing.openAnalysis")}
          </Button>
        </aside>
      </div>
    </GlassPanel>
  );
}
