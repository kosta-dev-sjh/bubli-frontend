"use client";

import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Columns3,
  LayoutDashboard,
  Link2,
  MonitorUp,
  Sparkles,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./wbs-todo-linkage-panel.module.css";

export type WbsCandidateStatus = "DRAFT" | "APPROVED" | "HELD" | "REJECTED";
export type LinkedTaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED";
export type LinkedSurfaceTone = "board" | "dashboard" | "bubble" | "schedule";

export type WbsCandidate = {
  code: string;
  confidence?: number;
  sourceLabel: string;
  status: WbsCandidateStatus;
  title: string;
};

export type LinkedTask = {
  assigneeLabel: string;
  dueLabel: string;
  idLabel: string;
  progress: number;
  status: LinkedTaskStatus;
  title: string;
};

export type LinkedSurface = {
  description: string;
  id: LinkedSurfaceTone;
  label: string;
  sourceLabel: string;
};

export type WbsTodoLinkagePanelProps = {
  candidate?: WbsCandidate;
  className?: string;
  linkedSurfaces?: LinkedSurface[];
  onApproveCandidate?: () => void;
  onOpenBoard?: () => void;
  onOpenSchedule?: () => void;
  onOpenWidget?: () => void;
  task?: LinkedTask;
};

const candidateStatusCopy: Record<WbsCandidateStatus, MessageKey> = {
  APPROVED: "wbs.linkage.candidate.approved",
  DRAFT: "wbs.linkage.candidate.draft",
  HELD: "wbs.linkage.candidate.held",
  REJECTED: "wbs.linkage.candidate.rejected",
};

const candidateTone: Record<WbsCandidateStatus, "approved" | "pending" | "warning" | "neutral"> = {
  APPROVED: "approved",
  DRAFT: "pending",
  HELD: "warning",
  REJECTED: "neutral",
};

const taskStatusCopy: Record<LinkedTaskStatus, MessageKey> = {
  BLOCKED: "wbs.linkage.task.blocked",
  DONE: "wbs.linkage.task.done",
  IN_PROGRESS: "wbs.linkage.task.inProgress",
  REVIEW: "wbs.linkage.task.review",
  TODO: "wbs.linkage.task.todo",
};

const taskTone: Record<LinkedTaskStatus, "approved" | "pending" | "todo" | "warning" | "neutral"> = {
  BLOCKED: "warning",
  DONE: "approved",
  IN_PROGRESS: "todo",
  REVIEW: "pending",
  TODO: "neutral",
};

const surfaceIcon: Record<LinkedSurfaceTone, ReactNode> = {
  board: <Columns3 size={18} strokeWidth={2.1} />,
  bubble: <MonitorUp size={18} strokeWidth={2.1} />,
  dashboard: <LayoutDashboard size={18} strokeWidth={2.1} />,
  schedule: <CalendarDays size={18} strokeWidth={2.1} />,
};

type SurfaceHandlerKey = "onOpenBoard" | "onOpenSchedule" | "onOpenWidget";

const surfaceCta: Record<LinkedSurfaceTone, { labelKey: MessageKey; onClick: SurfaceHandlerKey }> = {
  board: { labelKey: "wbs.linkage.cta.openBoard", onClick: "onOpenBoard" },
  bubble: { labelKey: "wbs.linkage.cta.viewBubble", onClick: "onOpenWidget" },
  dashboard: { labelKey: "wbs.linkage.cta.dashboardBase", onClick: "onOpenBoard" },
  schedule: { labelKey: "wbs.linkage.cta.openSchedule", onClick: "onOpenSchedule" },
};

const defaultCandidate: WbsCandidate = {
  code: "1.2.1",
  confidence: 91,
  sourceLabel: "wbs.linkage.default.sourceLabel",
  status: "DRAFT",
  title: "wbs.linkage.default.candidateTitle",
};

const defaultTask: LinkedTask = {
  assigneeLabel: "wbs.linkage.default.assignee",
  dueLabel: "D-2",
  idLabel: "wbs.linkage.default.idLabel",
  progress: 46,
  status: "IN_PROGRESS",
  title: "wbs.linkage.default.taskTitle",
};

const defaultSurfaces: LinkedSurface[] = [
  {
    description: "wbs.linkage.surface.board.description",
    id: "board",
    label: "wbs.linkage.surface.board.label",
    sourceLabel: "wbs.linkage.surface.board.source",
  },
  {
    description: "wbs.linkage.surface.dashboard.description",
    id: "dashboard",
    label: "wbs.linkage.surface.dashboard.label",
    sourceLabel: "wbs.linkage.surface.dashboard.source",
  },
  {
    description: "wbs.linkage.surface.bubble.description",
    id: "bubble",
    label: "wbs.linkage.surface.bubble.label",
    sourceLabel: "wbs.linkage.surface.bubble.source",
  },
  {
    description: "wbs.linkage.surface.schedule.description",
    id: "schedule",
    label: "wbs.linkage.surface.schedule.label",
    sourceLabel: "wbs.linkage.surface.schedule.source",
  },
];

export function WbsTodoLinkagePanel({
  candidate,
  className,
  linkedSurfaces,
  onApproveCandidate,
  onOpenBoard,
  onOpenSchedule,
  onOpenWidget,
  task,
}: WbsTodoLinkagePanelProps) {
  const { t } = useI18n();
  const resolvedCandidate: WbsCandidate = candidate ?? {
    ...defaultCandidate,
    sourceLabel: t("wbs.linkage.default.sourceLabel"),
    title: t("wbs.linkage.default.candidateTitle"),
  };
  const resolvedTask: LinkedTask = task ?? {
    ...defaultTask,
    assigneeLabel: t("wbs.linkage.default.assignee"),
    idLabel: t("wbs.linkage.default.idLabel"),
    title: t("wbs.linkage.default.taskTitle"),
  };
  const resolvedSurfaces: LinkedSurface[] = linkedSurfaces ?? defaultSurfaces.map((surface) => ({
    ...surface,
    description: t(surface.description as MessageKey),
    label: t(surface.label as MessageKey),
    sourceLabel: t(surface.sourceLabel as MessageKey),
  }));
  const handlers = {
    onApproveCandidate,
    onOpenBoard,
    onOpenSchedule,
    onOpenWidget,
  };

  return (
    <GlassPanel className={cn(styles.panel, className)}>
      <header className={styles.header}>
        <div>
          <Chip icon={<Workflow size={14} />}>{t("wbs.linkage.chip")}</Chip>
          <h2>{t("wbs.linkage.heading")}</h2>
          <p>{t("wbs.linkage.intro")}</p>
        </div>
        <StatusBadge tone={candidateTone[resolvedCandidate.status]}>{t(candidateStatusCopy[resolvedCandidate.status])}</StatusBadge>
      </header>

      <div className={styles.flow}>
        <section className={styles.candidateCard} aria-label={t("wbs.linkage.candidateAria")}>
          <span className={styles.stepIcon} aria-hidden="true">
            <Bot size={18} strokeWidth={2.1} />
          </span>
          <p className={styles.eyebrow}>{t("wbs.linkage.candidateEyebrow")}</p>
          <h3>{resolvedCandidate.title}</h3>
          <dl className={styles.metaGrid}>
            <div>
              <dt>{t("wbs.linkage.wbsCode")}</dt>
              <dd>{resolvedCandidate.code}</dd>
            </div>
            <div>
              <dt>{t("wbs.linkage.source")}</dt>
              <dd>{resolvedCandidate.sourceLabel}</dd>
            </div>
          </dl>
          {typeof resolvedCandidate.confidence === "number" ? (
            <ProgressBar label={t("wbs.linkage.confidence")} value={resolvedCandidate.confidence} />
          ) : null}
          <Button icon={<CheckCircle2 size={15} />} onClick={onApproveCandidate} size="sm" variant="primary">
            {t("wbs.linkage.approveCandidate")}
          </Button>
        </section>

        <div className={styles.connector} aria-hidden="true">
          <ArrowRight size={22} />
          <span>{t("wbs.linkage.userConfirm")}</span>
        </div>

        <section className={styles.taskCard} aria-label={t("wbs.linkage.taskAria")}>
          <div className={styles.taskHalo} aria-hidden="true" />
          <div className={styles.taskTop}>
            <span className={styles.taskIcon} aria-hidden="true">
              <ClipboardList size={20} strokeWidth={2.2} />
            </span>
            <StatusBadge tone={taskTone[resolvedTask.status]}>{t(taskStatusCopy[resolvedTask.status])}</StatusBadge>
          </div>
          <p className={styles.eyebrow}>{t("wbs.linkage.taskEyebrow")}</p>
          <h3>{resolvedTask.title}</h3>
          <div className={styles.taskChips}>
            <Chip>{resolvedTask.dueLabel}</Chip>
            <Chip>{resolvedTask.assigneeLabel}</Chip>
            <Chip>{resolvedTask.idLabel}</Chip>
          </div>
          <ProgressBar label={t("wbs.linkage.progress")} value={resolvedTask.progress} />
          <p className={styles.taskNote}>{t("wbs.linkage.taskNote")}</p>
        </section>

        <section className={styles.surfaceGrid} aria-label={t("wbs.linkage.surfaceGridAria")}>
          {resolvedSurfaces.map((surface) => {
            const cta = surfaceCta[surface.id];
            const handler = handlers[cta.onClick];

            return (
              <article className={cn(styles.surfaceCard, styles[surface.id])} key={surface.id}>
                <span className={styles.surfaceIcon} aria-hidden="true">
                  {surfaceIcon[surface.id]}
                </span>
                <div>
                  <h3>{surface.label}</h3>
                  <p>{surface.description}</p>
                  <span>{surface.sourceLabel}</span>
                </div>
                {typeof handler === "function" ? (
                  <button className={styles.surfaceButton} onClick={handler} type="button">
                    {t(cta.labelKey)}
                  </button>
                ) : null}
              </article>
            );
          })}
        </section>
      </div>

      <section className={styles.policyGrid} aria-label={t("wbs.linkage.policyAria")}>
        <article>
          <Sparkles size={17} strokeWidth={2.1} />
          <h3>{t("wbs.linkage.policy.createTitle")}</h3>
          <p>{t("wbs.linkage.policy.createBody")}</p>
        </article>
        <article>
          <CheckCircle2 size={17} strokeWidth={2.1} />
          <h3>{t("wbs.linkage.policy.confirmTitle")}</h3>
          <p>{t("wbs.linkage.policy.confirmBody")}</p>
        </article>
        <article>
          <Link2 size={17} strokeWidth={2.1} />
          <h3>{t("wbs.linkage.policy.dedupeTitle")}</h3>
          <p>{t("wbs.linkage.policy.dedupeBody")}</p>
        </article>
      </section>

      <footer className={styles.footer}>
        {t("wbs.linkage.footer")}
      </footer>
    </GlassPanel>
  );
}
