"use client";

"use client";

import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Columns3,
  LayoutDashboard,
  ListTodo,
  MonitorUp,
  PauseCircle,
  PencilLine,
  Save,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StatusTone } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import styles from "./todo-detail-panel.module.css";

export type TodoDetailScope = "PERSONAL" | "PROJECT_ROOM";
export type TodoDetailStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED";
export type TodoDetailSource = "DIRECT" | "APPROVED_CANDIDATE";
export type TodoDetailSurface = "WORK_BOARD" | "DASHBOARD" | "BUBBLE" | "SCHEDULE";

export type TodoDetail = {
  assigneeLabel?: string;
  description?: string;
  dueLabel?: string;
  id: string;
  linkedProjectRoomLabel?: string;
  progressPercent: number;
  scope: TodoDetailScope;
  source: TodoDetailSource;
  status: TodoDetailStatus;
  surfaces: TodoDetailSurface[];
  title: string;
};

export type TodoDetailPanelProps = HTMLAttributes<HTMLElement> & {
  onDelete?: (todoId: string) => void;
  onSave?: (todoId: string) => void;
  onStatusChange?: (todoId: string, status: TodoDetailStatus) => void;
  todo?: TodoDetail;
};

const statusMeta: Record<TodoDetailStatus, { icon: ReactNode; labelKey: MessageKey; tone: StatusTone }> = {
  BLOCKED: { icon: <PauseCircle size={16} strokeWidth={2.1} />, labelKey: "todo.detail.status.blocked", tone: "warning" },
  DONE: { icon: <CheckCircle2 size={16} strokeWidth={2.1} />, labelKey: "todo.detail.status.done", tone: "approved" },
  IN_PROGRESS: { icon: <PencilLine size={16} strokeWidth={2.1} />, labelKey: "todo.detail.status.inProgress", tone: "todo" },
  REVIEW: { icon: <UserRoundCheck size={16} strokeWidth={2.1} />, labelKey: "todo.detail.status.review", tone: "pending" },
  TODO: { icon: <Circle size={16} strokeWidth={2.1} />, labelKey: "todo.detail.status.todo", tone: "neutral" },
};

const scopeMeta: Record<TodoDetailScope, { labelKey: MessageKey; tone: StatusTone }> = {
  PERSONAL: { labelKey: "todo.detail.scope.personal", tone: "personal" },
  PROJECT_ROOM: { labelKey: "todo.detail.scope.room", tone: "room" },
};

const sourceMeta: Record<TodoDetailSource, { descriptionKey: MessageKey; labelKey: MessageKey }> = {
  APPROVED_CANDIDATE: {
    descriptionKey: "todo.detail.source.approvedDescription",
    labelKey: "todo.detail.source.approvedLabel",
  },
  DIRECT: {
    descriptionKey: "todo.detail.source.directDescription",
    labelKey: "todo.detail.source.directLabel",
  },
};

const surfaceMeta: Record<TodoDetailSurface, { icon: ReactNode; labelKey: MessageKey }> = {
  BUBBLE: { icon: <MonitorUp size={15} strokeWidth={2.1} />, labelKey: "todo.detail.surface.bubble" },
  DASHBOARD: { icon: <LayoutDashboard size={15} strokeWidth={2.1} />, labelKey: "todo.detail.surface.dashboard" },
  SCHEDULE: { icon: <CalendarClock size={15} strokeWidth={2.1} />, labelKey: "todo.detail.surface.schedule" },
  WORK_BOARD: { icon: <Columns3 size={15} strokeWidth={2.1} />, labelKey: "todo.detail.surface.board" },
};

const statusOrder: TodoDetailStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"];

export const defaultTodoDetail: TodoDetail = {
  assigneeLabel: "todo.detail.default.assigneeMe",
  description: "todo.detail.default.description",
  dueLabel: "todo.detail.default.dueToday",
  id: "todo-send-client-question",
  linkedProjectRoomLabel: "todo.detail.default.roomTranslation",
  progressPercent: 42,
  scope: "PROJECT_ROOM",
  source: "APPROVED_CANDIDATE",
  status: "IN_PROGRESS",
  surfaces: ["WORK_BOARD", "DASHBOARD", "BUBBLE"],
  title: "todo.detail.default.title",
};

export function TodoDetailPanel({
  className,
  onDelete,
  onSave,
  onStatusChange,
  todo = defaultTodoDetail,
  ...props
}: TodoDetailPanelProps) {
  const { t } = useI18n();
  const status = statusMeta[todo.status];
  const scope = scopeMeta[todo.scope];
  const source = sourceMeta[todo.source];

  return (
    <GlassPanel as="section" className={cn(styles.panel, className)} {...props}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <Chip icon={<ListTodo size={15} strokeWidth={2.1} />}>{t("todo.detail.chip")}</Chip>
          <div>
            <h2 className={styles.title}>{t(todo.title as MessageKey)}</h2>
            <p className={styles.description}>{t("todo.detail.description")}</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button icon={<Save size={15} strokeWidth={2.1} />} onClick={() => onSave?.(todo.id)} size="sm" variant="primary">
            {t("todo.detail.save")}
          </Button>
          <Button icon={<Trash2 size={15} strokeWidth={2.1} />} onClick={() => onDelete?.(todo.id)} size="sm" variant="quiet">
            {t("todo.detail.delete")}
          </Button>
        </div>
      </header>

      <section className={styles.summaryGrid} aria-label={t("todo.detail.summaryAria")}>
        <article>
          <span>{t("todo.detail.field.status")}</span>
          <strong>{t(status.labelKey)}</strong>
          <StatusBadge tone={status.tone}>{status.icon} {t("todo.detail.currentStatus")}</StatusBadge>
        </article>
        <article>
          <span>{t("todo.detail.field.scope")}</span>
          <strong>{t(scope.labelKey)}</strong>
          <StatusBadge tone={scope.tone}>{todo.linkedProjectRoomLabel ? t(todo.linkedProjectRoomLabel as MessageKey) : t("todo.detail.personalWork")}</StatusBadge>
        </article>
        <article>
          <span>{t("todo.detail.field.assignee")}</span>
          <strong>{todo.assigneeLabel ? t(todo.assigneeLabel as MessageKey) : t("todo.detail.assigneeMe")}</strong>
          <p>{todo.scope === "PROJECT_ROOM" ? t("todo.detail.assigneeRoomNote") : t("todo.detail.assigneePersonalNote")}</p>
        </article>
        <article>
          <span>{t("todo.detail.field.due")}</span>
          <strong>{todo.dueLabel ? t(todo.dueLabel as MessageKey) : t("todo.detail.dueNone")}</strong>
          <p>{t("todo.detail.dueNote")}</p>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.editorCard} aria-label={t("todo.detail.editAria")}>
          <div className={styles.sectionTitle}>
            <strong>{t("todo.detail.statusChange")}</strong>
            <StatusBadge tone={status.tone}>{t(status.labelKey)}</StatusBadge>
          </div>
          <div className={styles.statusGrid}>
            {statusOrder.map((statusKey) => {
              const meta = statusMeta[statusKey];
              const selected = statusKey === todo.status;

              return (
                <button
                  className={cn(styles.statusButton, selected && styles.statusButtonSelected)}
                  key={statusKey}
                  onClick={() => onStatusChange?.(todo.id, statusKey)}
                  type="button"
                >
                  <span aria-hidden="true">{meta.icon}</span>
                  <b>{t(meta.labelKey)}</b>
                </button>
              );
            })}
          </div>

          <div className={styles.memoBox}>
            <span>{t("todo.detail.memoLabel")}</span>
            <p>{todo.description ? t(todo.description as MessageKey) : t("todo.detail.memoEmpty")}</p>
          </div>

          <div className={styles.progressBox}>
            <div>
              <span>{t("todo.detail.progress")}</span>
              <strong>{todo.progressPercent}%</strong>
            </div>
            <ProgressBar value={todo.progressPercent} />
          </div>
        </section>

        <aside className={styles.linkCard} aria-label={t("todo.detail.linkAria")}>
          <div className={styles.sectionTitle}>
            <strong>{t("todo.detail.displaySurface")}</strong>
            <StatusBadge tone="todo">{t("todo.detail.surfaceCount", { count: todo.surfaces.length })}</StatusBadge>
          </div>
          <div className={styles.surfaceStack}>
            {todo.surfaces.map((surface) => {
              const meta = surfaceMeta[surface];

              return (
                <div className={styles.surfaceRow} key={surface}>
                  <span aria-hidden="true">{meta.icon}</span>
                  <b>{t(meta.labelKey)}</b>
                  <small>{surface === "WORK_BOARD" ? t("todo.detail.surfaceRoomNote") : t("todo.detail.surfacePersonalNote")}</small>
                </div>
              );
            })}
          </div>

          <div className={styles.sourceCard}>
            <span>{t(source.labelKey)}</span>
            <p>{t(source.descriptionKey)}</p>
          </div>

          <div className={styles.ruleList}>
            <p>{t("todo.detail.rule1")}</p>
            <p>{t("todo.detail.rule2")}</p>
            <p>{t("todo.detail.rule3")}</p>
          </div>
        </aside>
      </div>
    </GlassPanel>
  );
}
